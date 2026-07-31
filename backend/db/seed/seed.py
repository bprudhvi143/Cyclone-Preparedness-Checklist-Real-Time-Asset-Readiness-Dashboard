import asyncio
import datetime
from sqlalchemy import select
from app.core.database import AsyncSessionLocal, engine
from app.core.security import hash_password
from app.infrastructure.db.models import (
    DisasterType, Zone, Ward, User, Shelter, AssetCategory, Asset,
    OperationalCycle, ChecklistTemplate, ChecklistSection, ChecklistQuestion,
    ScoringConfiguration
)
from geoalchemy2.shape import from_shape
from shapely.geometry import Point

async def seed_data():
    async with AsyncSessionLocal() as db:
        print("Starting database seeding...")

        # 1. Seeding Disaster Types
        disaster_type = await db.scalar(select(DisasterType).where(DisasterType.code == "CYCLONE"))
        if not disaster_type:
            disaster_type = DisasterType(
                name="Cyclone Preparedness",
                code="CYCLONE",
                description="Preparedness inspections for coastal tropical cyclone activations"
            )
            db.add(disaster_type)
            await db.flush()
            print("Seeded disaster type: CYCLONE")

        # 2. Seeding Zones
        zone = await db.scalar(select(Zone).where(Zone.code == "Z1"))
        if not zone:
            zone = Zone(name="Zone-I (Madhurawada)", code="Z1")
            db.add(zone)
            await db.flush()
            print("Seeded Zone I")

        # 3. Seeding Wards
        ward = await db.scalar(select(Ward).where(Ward.number == 1))
        if not ward:
            ward = Ward(
                zone_id=zone.id,
                number=1,
                name="Madhurawada East",
                boundary=None # Boundary polygon optional for local MVP setup
            )
            db.add(ward)
            await db.flush()
            print("Seeded Ward 1")

        # 4. Seeding Users
        admin = await db.scalar(select(User).where(User.email == "admin@gvmc.gov.in"))
        if not admin:
            admin = User(
                full_name="GVMC System Admin",
                email="admin@gvmc.gov.in",
                phone="9876543210",
                password_hash=hash_password("admin_pass_2026"),
                role="ADMIN",
                status="ACTIVE"
            )
            db.add(admin)

        comm = await db.scalar(select(User).where(User.email == "commissioner@gvmc.gov.in"))
        if not comm:
            comm = User(
                full_name="GVMC Commissioner",
                email="commissioner@gvmc.gov.in",
                phone="9876543211",
                password_hash=hash_password("comm_pass_2026"),
                role="COMMISSIONER",
                status="ACTIVE"
            )
            db.add(comm)

        zone_off = await db.scalar(select(User).where(User.email == "zone1@gvmc.gov.in"))
        if not zone_off:
            zone_off = User(
                full_name="Madhurawada Zone Officer",
                email="zone1@gvmc.gov.in",
                phone="9876543212",
                password_hash=hash_password("zone_pass_2026"),
                role="ZONE_OFFICER",
                zone_id=zone.id,
                status="ACTIVE"
            )
            db.add(zone_off)

        field_off = await db.scalar(select(User).where(User.email == "field1@gvmc.gov.in"))
        if not field_off:
            field_off = User(
                full_name="Ward 1 Field Officer",
                email="field1@gvmc.gov.in",
                phone="9876543213",
                password_hash=hash_password("field_pass_2026"),
                role="FIELD_OFFICER",
                ward_id=ward.id,
                status="ACTIVE"
            )
            db.add(field_off)
        await db.flush()
        print("Seeded basic user accounts")

        # 5. Seeding Shelters
        shelter = await db.scalar(select(Shelter).where(Shelter.name == "MVP Community Hall"))
        if not shelter:
            gps_point = from_shape(Point(83.332, 17.744), srid=4326)
            shelter = Shelter(
                ward_id=ward.id,
                name="MVP Community Hall",
                address="Sector 4, MVP Colony, Visakhapatnam",
                location=gps_point,
                capacity=500,
                contact_person="R. Prasad (Shelter Manager)",
                contact_phone="9876543214"
            )
            db.add(shelter)
            await db.flush()
            print("Seeded safe shelter MVP Community Hall")

        # 6. Seeding Asset Categories
        cat_genset = await db.scalar(select(AssetCategory).where(AssetCategory.code == "GENSET"))
        if not cat_genset:
            cat_genset = AssetCategory(name="Generator Setup", code="GENSET", description="Power backup setups")
            db.add(cat_genset)

        cat_pump = await db.scalar(select(AssetCategory).where(AssetCategory.code == "PUMP"))
        if not cat_pump:
            cat_pump = AssetCategory(name="Dewatering Pump", code="PUMP", description="Submersible flood water pumps")
            db.add(cat_pump)
        await db.flush()

        # 7. Seeding Assets
        asset = await db.scalar(select(Asset).where(Asset.serial_number == "GVMC-GEN-001"))
        if not asset:
            gps_asset = from_shape(Point(83.332, 17.744), srid=4326)
            asset = Asset(
                category_id=cat_genset.id,
                ward_id=ward.id,
                shelter_id=shelter.id,
                name="MVP Shelter 125kVA Backup Gen",
                serial_number="GVMC-GEN-001",
                status="FUNCTIONAL",
                location=gps_asset
            )
            db.add(asset)
            await db.flush()
            print("Seeded active generator asset")

        # 8. Seeding Scoring configurations
        config = await db.scalar(select(ScoringConfiguration).where(ScoringConfiguration.is_active == True))
        if not config:
            config = ScoringConfiguration(
                disaster_type_id=disaster_type.id,
                section_weights={
                    "INFRASTRUCTURE": 0.40,
                    "POWER_WATER": 0.30,
                    "SUPPLIES": 0.20,
                    "PERSONNEL": 0.10
                },
                is_active=True
            )
            db.add(config)

        # 9. Seeding Checklist Template & Questions
        template = await db.scalar(select(ChecklistTemplate).where(ChecklistTemplate.is_active == True))
        if not template:
            template = ChecklistTemplate(
                disaster_type_id=disaster_type.id,
                title="Cyclone Shelter Pre-Landfall Verification Checklist",
                version=1,
                is_active=True
            )
            db.add(template)
            await db.flush()

            # Add Sections
            sec_infra = ChecklistSection(template_id=template.id, title="Infrastructure Structural Integrity", sort_order=1)
            sec_power = ChecklistSection(template_id=template.id, title="Utility Power & Water", sort_order=2)
            sec_supply = ChecklistSection(template_id=template.id, title="Essential Supplies", sort_order=3)
            sec_staff = ChecklistSection(template_id=template.id, title="Emergency Staff Staging", sort_order=4)
            db.add_all([sec_infra, sec_power, sec_supply, sec_staff])
            await db.flush()

            # Add Questions
            q1 = ChecklistQuestion(
                section_id=sec_infra.id,
                question_text="Are all shelter doors and windows structurally intact and lockable?",
                weight=5,
                requires_photo=True,
                is_critical=True,
                sort_order=1
            )
            q2 = ChecklistQuestion(
                section_id=sec_power.id,
                question_text="Is the backup diesel generator functional with fuel above 75%?",
                weight=5,
                requires_photo=True,
                is_critical=True,
                sort_order=1
            )
            q3 = ChecklistQuestion(
                section_id=sec_supply.id,
                question_text="Are dry food rations and drinking water stored and valid for 3 days?",
                weight=4,
                requires_photo=False,
                is_critical=False,
                sort_order=1
            )
            q4 = ChecklistQuestion(
                section_id=sec_staff.id,
                question_text="Are designated first-aid doctors and rescue volunteers present?",
                weight=3,
                requires_photo=False,
                is_critical=False,
                sort_order=1
            )
            db.add_all([q1, q2, q3, q4])
            print("Seeded Checklist Template Sections & Questions")

        # 10. Seeding Active Operational Cycle
        cycle = await db.scalar(select(OperationalCycle).where(OperationalCycle.status == "ACTIVE"))
        if not cycle:
            cycle = OperationalCycle(
                disaster_type_id=disaster_type.id,
                name="Cyclone Gulab Pre-Landfall Prep - Oct 2026",
                status="ACTIVE",
                start_date=datetime.datetime.now(datetime.timezone.utc)
            )
            db.add(cycle)
            print("Seeded active Operational Cycle")

        await db.commit()
        print("Database seeding completed successfully.")

if __name__ == "__main__":
    asyncio.run(seed_data())
