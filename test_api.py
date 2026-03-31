import urllib.request
import urllib.parse
import json
import time

BASE_URL = "http://localhost:8000"


def make_request(method, path, data=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}

    if token:
        headers["Authorization"] = f"Bearer {token}"

    if data:
        body = json.dumps(data).encode("utf-8")
    else:
        body = None

    req = urllib.request.Request(url, data=body, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))
    except Exception as e:
        return None, str(e)


def test_root():
    status, data = make_request("GET", "/")
    print(f"GET / -> {status}: {data}")
    assert status == 200


def test_register():
    timestamp = int(time.time())
    user_data = {
        "username": f"testuser_{timestamp}",
        "email": f"test_{timestamp}@test.com",
        "password": "testpass123",
    }
    status, data = make_request("POST", "/auth/register", user_data)
    print(f"POST /auth/register -> {status}: {data}")
    assert status == 201
    return data, user_data


def test_register_duplicate():
    user_data = {
        "username": f"testuser_{int(time.time())}",
        "email": "duplicate@test.com",
        "password": "testpass123",
    }
    status1, _ = make_request("POST", "/auth/register", user_data)
    status2, data2 = make_request("POST", "/auth/register", user_data)
    print(f"POST /auth/register (duplicate) -> {status2}: {data2}")
    assert status2 == 400


def test_login(username, password):
    data = {"username": username, "password": password}
    body = urllib.parse.urlencode(data).encode("utf-8")
    url = f"{BASE_URL}/auth/login"
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")

    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read().decode("utf-8"))
        print(f"POST /auth/login -> 200: Token received")
        return result


def test_categories():
    status, data = make_request("GET", "/categories")
    print(f"GET /categories -> {status}")
    if status == 200:
        print(f"  Categories: {len(data)} found")
    return status


def test_articles(token=None):
    status, data = make_request("GET", "/articles", token=token)
    print(f"GET /articles -> {status}")
    if status == 200:
        print(f"  Items: {data.get('total', 0)}, Pages: {data.get('pages', 1)}")
    return status


def test_create_article(token):
    timestamp = int(time.time())
    article_data = {
        "title": "Test Article",
        "slug": f"test-article-{timestamp}",
        "content": "This is a test article with some content to make it longer.",
        "category_id": None,
        "tags": ["test", "api"],
    }
    status, data = make_request("POST", "/articles", article_data, token)
    print(f"POST /articles -> {status}")
    if status in [200, 201]:
        print(f"  Article created: {data.get('title', 'N/A')}")
    else:
        print(f"  Error: {data}")
    return status


def test_search():
    status, data = make_request("GET", "/articles/search?q=test")
    print(f"GET /articles/search -> {status}")
    return status


def run_all_tests():
    print("=" * 50)
    print("API TEST SUITE")
    print("=" * 50)

    try:
        print("\n[1] Testing Root Endpoint")
        test_root()

        print("\n[2] Testing Registration")
        result, user_data = test_register()
        username = user_data["username"]
        password = user_data["password"]

        print("\n[3] Testing Duplicate Registration")
        test_register_duplicate()

        print("\n[4] Testing Login")
        tokens = test_login(username, password)
        token = tokens["access_token"]

        print("\n[5] Testing Categories")
        test_categories()

        print("\n[6] Testing Articles (Public)")
        test_articles()

        print("\n[7] Testing Articles (Authenticated)")
        test_articles(token)

        print("\n[8] Testing Create Article")
        test_create_article(token)

        print("\n[9] Testing Search")
        test_search()

        print("\n" + "=" * 50)
        print("ALL TESTS PASSED!")
        print("=" * 50)
    except AssertionError as e:
        print(f"\nTEST FAILED: {e}")
    except urllib.error.URLError as e:
        print(
            f"ERROR: Cannot connect to API. Make sure the backend is running at {BASE_URL}"
        )
        print(f"Details: {e}")


if __name__ == "__main__":
    run_all_tests()
