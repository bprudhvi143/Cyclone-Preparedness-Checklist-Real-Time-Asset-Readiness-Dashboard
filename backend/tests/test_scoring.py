import pytest
from app.services.scoring_service import ScoringService
from app.infrastructure.db.models import ChecklistSubmission, ChecklistResponse, ChecklistQuestion, ChecklistSection

class MockSection:
    def __init__(self, title: str):
        self.title = title

class MockQuestion:
    def __init__(self, title: str, weight: int):
        self.section = MockSection(title)
        self.weight = weight

class MockResponse:
    def __init__(self, category_title: str, weight: int, value: str):
        self.question = MockQuestion(category_title, weight)
        self.response_value = value

def test_submission_readiness_scoring():
    # Arrange: Mock a submission containing responses across 4 categories
    responses = [
        # INFRASTRUCTURE (Weight 40%) - YES (Weight 5) -> Section Score 100%
        MockResponse("Infrastructure Integrity", 5, "YES"),
        # POWER_WATER (Weight 30%) - NO (Weight 5) -> Section Score 0%
        MockResponse("Power and Utilities", 5, "NO"),
        # SUPPLIES (Weight 20%) - YES (Weight 4) -> Section Score 100%
        MockResponse("Essential Food & Supplies", 4, "YES"),
        # PERSONNEL (Weight 10%) - YES (Weight 3) -> Section Score 100%
        MockResponse("Staged Emergency Volunteers", 3, "YES")
    ]
    
    mock_submission = ChecklistSubmission()
    mock_submission.responses = responses
    
    section_weights = {
        "INFRASTRUCTURE": 0.40,
        "POWER_WATER": 0.30,
        "SUPPLIES": 0.20,
        "PERSONNEL": 0.10
    }
    
    service = ScoringService(snapshot_repo=None) # Repo unneeded for internal calculation test
    
    # Act
    score, breakdown = service._calculate_submission_score(mock_submission, section_weights)
    
    # Assert
    # INFRASTRUCTURE: (5/5)*100 = 100 * 0.40 = 40.0
    # POWER_WATER: (0/5)*100 = 0 * 0.30 = 0.0
    # SUPPLIES: (4/4)*100 = 100 * 0.20 = 20.0
    # PERSONNEL: (3/3)*100 = 100 * 0.10 = 10.0
    # Expected Score: 40.0 + 0.0 + 20.0 + 10.0 = 70.0
    assert score == 70.0
    assert breakdown["INFRASTRUCTURE"] == 100.0
    assert breakdown["POWER_WATER"] == 0.0
    assert breakdown["SUPPLIES"] == 100.0
    assert breakdown["PERSONNEL"] == 100.0
