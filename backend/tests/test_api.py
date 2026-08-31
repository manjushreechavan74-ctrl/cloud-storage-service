def test_health(client):
    response = client.get("/health")

    assert response.status_code == 200


def test_root(client):
    response = client.get("/")

    assert response.status_code == 200


def test_files_requires_authentication(client):
    response = client.get("/files")

    assert response.status_code == 401


def test_search_requires_authentication(client):
    response = client.get("/files/search?q=resume")

    assert response.status_code == 401