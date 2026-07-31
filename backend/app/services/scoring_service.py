import uuid
import datetime
import logging
from typing import List, Dict, Any, Tuple
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload
from app.infrastructure.db.models import (
    ReadinessSnapshot, ChecklistSubmission, ChecklistResponse, ChecklistQuestion,
    ScoringConfiguration, Shelter, Asset, Ward, Zone
)
from app.infrastructure.db.repositories.custom_repositories import ReadinessSnapshotRepository

logger = logging.getLogger("gvmc_api")

class ScoringService:
    def __init__(self, snapshot_repo: ReadinessSnapshotRepository):
        self.snapshot_repo = snapshot_repo

    async def calculate_cycle_readiness(self, operational_cycle_id: uuid.UUID) -> None:
        """Run aggregation compute tasks to refresh snapshots for shelters, wards, zones, and city."""
        db = self.snapshot_repo.db

        # Fetch active scoring configurations
        config_query = select(ScoringConfiguration).where(ScoringConfiguration.is_active == True)
        config_res = await db.execute(config_query)
        scoring_config = config_res.scalars().first()
        
        # Default weights if not seeded
        section_weights = {
            "INFRASTRUCTURE": 0.40,
            "POWER_WATER": 0.30,
            "SUPPLIES": 0.20,
            "PERSONNEL": 0.10
        }
        if scoring_config:
            section_weights = scoring_config.section_weights

        # Fetch all approved submissions for the operational cycle
        sub_query = (
            select(ChecklistSubmission)
            .options(
                selectinload(ChecklistSubmission.responses).selectinload(ChecklistResponse.question)
            )
            .where(
                and_(
                    ChecklistSubmission.operational_cycle_id == operational_cycle_id,
                    ChecklistSubmission.status == "APPROVED",
                    ChecklistSubmission.deleted_at == None
                )
            )
        )
        result = await db.execute(sub_query)
        submissions = result.scalars().all()

        # 1. Group submissions by location entity (Shelter or Asset)
        shelter_scores: Dict[uuid.UUID, float] = {}
        shelter_breakdowns: Dict[uuid.UUID, Dict[str, Any]] = {}
        
        # Track shelter data
        for sub in submissions:
            if sub.shelter_id:
                score, breakdown = self._calculate_submission_score(sub, section_weights)
                shelter_scores[sub.shelter_id] = score
                shelter_breakdowns[sub.shelter_id] = breakdown
                
                # Write individual shelter snapshot
                snapshot = ReadinessSnapshot(
                    operational_cycle_id=operational_cycle_id,
                    entity_type="SHELTER",
                    entity_id=sub.shelter_id,
                    score=score,
                    breakdown=breakdown,
                    calculated_at=datetime.datetime.now(datetime.timezone.utc)
                )
                db.add(snapshot)

        # 2. Ward aggregates
        wards_query = select(Ward).options(selectinload(Ward.shelters))
        wards_res = await db.execute(wards_query)
        wards = wards_res.scalars().all()
        
        ward_scores: Dict[uuid.UUID, float] = {}
        for ward in wards:
            # Average score of all shelters in the ward
            ward_shelter_ids = [s.id for s in ward.shelters if s.deleted_at is None]
            scores = [shelter_scores[sid] for sid in ward_shelter_ids if sid in shelter_scores]
            
            # Default to 0.0 if no submissions approved yet
            ward_score = sum(scores) / len(scores) if scores else 0.0
            ward_scores[ward.id] = ward_score
            
            # Write ward snapshot
            snapshot = ReadinessSnapshot(
                operational_cycle_id=operational_cycle_id,
                entity_type="WARD",
                entity_id=ward.id,
                score=ward_score,
                breakdown={"average_shelter_score": ward_score, "total_inspected": len(scores)},
                calculated_at=datetime.datetime.now(datetime.timezone.utc)
            )
            db.add(snapshot)

        # 3. Zone aggregates
        zones_query = select(Zone).options(selectinload(Zone.wards))
        zones_res = await db.execute(zones_query)
        zones = zones_res.scalars().all()
        
        zone_scores: Dict[uuid.UUID, float] = {}
        for zone in zones:
            ward_ids = [w.id for w in zone.wards]
            scores = [ward_scores[wid] for wid in ward_ids if wid in ward_scores]
            
            zone_score = sum(scores) / len(scores) if scores else 0.0
            zone_scores[zone.id] = zone_score
            
            snapshot = ReadinessSnapshot(
                operational_cycle_id=operational_cycle_id,
                entity_type="ZONE",
                entity_id=zone.id,
                score=zone_score,
                breakdown={"average_ward_score": zone_score, "total_wards": len(ward_ids)},
                calculated_at=datetime.datetime.now(datetime.timezone.utc)
            )
            db.add(snapshot)

        # 4. City-Wide aggregate
        all_zone_scores = list(zone_scores.values())
        city_score = sum(all_zone_scores) / len(all_zone_scores) if all_zone_scores else 0.0
        
        city_snapshot = ReadinessSnapshot(
            operational_cycle_id=operational_cycle_id,
            entity_type="CITY",
            entity_id=operational_cycle_id,  # City level snaps use cycle id
            score=city_score,
            breakdown={"average_zone_score": city_score, "active_zones_count": len(all_zone_scores)},
            calculated_at=datetime.datetime.now(datetime.timezone.utc)
        )
        db.add(city_snapshot)
        await db.flush()

    def _calculate_submission_score(
        self,
        submission: ChecklistSubmission,
        section_weights: Dict[str, float]
    ) -> Tuple[float, Dict[str, Any]]:
        """Calculate weighted score for a single submission based on question response weights."""
        section_totals: Dict[str, Tuple[float, float]] = {}  # category: (weighted_yes, total_weight)

        # Group responses by question category
        for resp in submission.responses:
            question = resp.question
            category = question.section.title if hasattr(question, "section") else "INFRASTRUCTURE" # Fallback check
            # Map category codes
            if "integrity" in category.lower() or "structure" in category.lower():
                category_code = "INFRASTRUCTURE"
            elif "power" in category.lower() or "water" in category.lower() or "utility" in category.lower():
                category_code = "POWER_WATER"
            elif "supply" in category.lower() or "relief" in category.lower():
                category_code = "SUPPLIES"
            else:
                category_code = "PERSONNEL"

            weight = question.weight
            
            if resp.response_value == "YES":
                yes_w, total_w = section_totals.get(category_code, (0.0, 0.0))
                section_totals[category_code] = (yes_w + weight, total_w + weight)
            elif resp.response_value == "NO":
                yes_w, total_w = section_totals.get(category_code, (0.0, 0.0))
                section_totals[category_code] = (yes_w, total_w + weight)
            # NOT_APPLICABLE responses are ignored in calculations

        # Calculate score per section and apply category weights
        total_score = 0.0
        breakdown_details = {}
        
        for cat, weight_pct in section_weights.items():
            yes_w, total_w = section_totals.get(cat, (0.0, 0.0))
            cat_score = (yes_w / total_w) * 100.0 if total_w > 0 else 100.0  # Default to 100 if no checks apply
            total_score += cat_score * weight_pct
            breakdown_details[cat] = round(cat_score, 2)

        return round(total_score, 2), breakdown_details
