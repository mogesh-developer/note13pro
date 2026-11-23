from toolkit.devices.garnet_specialist import GarnetSpecialistService

def test_garnet_specialist():
    assert GarnetSpecialistService.CODENAME == "garnet"
    assert GarnetSpecialistService.INDIAN_MODEL_ID == "2312DRA50I"
    assert len(GarnetSpecialistService.RECOMMENDED_RESOURCES) >= 4
    categories = [r["category"] for r in GarnetSpecialistService.RECOMMENDED_RESOURCES]
    assert any("TWRP" in c for c in categories)
    assert any("OrangeFox" in c for c in categories)
