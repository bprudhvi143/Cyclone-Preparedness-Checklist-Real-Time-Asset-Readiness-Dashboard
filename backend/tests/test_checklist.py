import pytest
import json
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import hash_password
from app.infrastructure.db.models import User, DisasterType, OperationalCycle, ChecklistTemplate, ChecklistSection, ChecklistQuestion, Shelter

@pytest.mark.asyncio
async def test_checklist_template_and_submission(client: AsyncClient, db_session: AsyncSession):
    # 1. Setup mock hierarchies and users
    disaster = DisasterType(name="Cyclone Prep Test", code="TEST_CYCLONE")
    db_session.add(disaster)
    await db_session.flush()

    user = User(
        full_name="Mock Field Officer",
        email="field_test@gvmc.gov.in",
        phone="9876543210",
        password_hash=hash_password("field_pass"),
        role="FIELD_OFFICER",
        status="ACTIVE"
    )
    db_session.add(user)
    await db_session.flush()

    cycle = OperationalCycle(
        disaster_type_id=disaster.id,
        name="Test Cycle 2026",
        status="ACTIVE",
        start_date=datetime_datetime_now()
    )
    db_session.add(cycle)
    await db_session.flush()

    shelter = Shelter(
        ward_id=user.id, # Using user.id as dummy ward_id to satisfy foreign key in sqlite test
        name="Test MVP Shelter",
        address="Test Address",
        location=None,
        capacity=100
    )
    db_session.add(shelter)
    await db_session.flush()

    template = ChecklistTemplate(
        disaster_type_id=disaster.id,
        title="Test template",
        version=1,
        is_active=True
    )
    db_session.add(template)
    await db_session.flush()

    section = ChecklistSection(template_id=template.id, title="Infrastructure Checks")
    db_session.add(section)
    await db_session.flush()

    q1 = ChecklistQuestion(section_id=section.id, question_text="Doors operational?", weight=5, is_critical=True)
    db_session.add(q1)
    await db_session.commit()

    # 2. Get login token for client header requests
    login_payload = {"email": "field_test@gvmc.gov.in", "password": "field_pass"}
    login_res = await client.post("/api/v1/auth/login", json=login_payload)
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Query active template
    tmpl_res = await client.get(f"/api/v1/checklists/templates/active?disaster_type_id={disaster.id}", headers=headers)
    assert tmpl_res.status_code == 200
    assert tmpl_res.json()["title"] == "Test template"

    # 4. Submit checklist form-data payload (no photos required for q1)
    submission_payload = {
        "operational_cycle_id": str(cycle.id),
        "shelter_id": str(shelter.id),
        "latitude": 17.74,
        "longitude": 83.33,
        "responses": [
            {
                "question_id": str(q1.id),
                "response_value": "YES",
                "remarks": "All doors look good"
            }
        ]
    }
    
    # Form data request mapping
    form_data = {
        "payload": json.dumps(submission_payload)
    }
    
    submit_res = await client.post("/api/v1/checklists/submissions", data=form_data, headers=headers)
    assert submit_res.status_code == 201
    submission_data = submit_res.json()
    assert submission_data["status"] == "PENDING"
    assert len(submission_data["responses"]) == 1
    assert submission_data["responses"][0]["response_value"] == "YES"

def datetime_datetime_now():
    import datetime
    return datetime.datetime.now(datetime.timezone.utc)
