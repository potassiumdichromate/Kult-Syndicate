extends Node
## The host owns browser credentials. Native local testing uses a demo bearer session.
signal completed(response: Dictionary)
var base_url: String = "http://127.0.0.1:8787"
var token: String = ""
var csrf: String = ""
var pending: bool = false
var callback: JavaScriptObject
var bridge: JavaScriptObject
var http: HTTPRequest

func _ready() -> void:
	http = HTTPRequest.new()
	http.timeout = 15.0
	add_child(http)
	if OS.has_feature("web"):
		bridge = JavaScriptBridge.get_interface("SyndicatesBridge")
		callback = JavaScriptBridge.create_callback(_on_bridge_response)
	else:
		var configured = OS.get_environment("SYNDICATES_API_URL")
		if not configured.is_empty():
			base_url = configured

func _on_bridge_response(args: Array) -> void:
	var decoded = JSON.parse_string(str(args[0]))
	if decoded is Dictionary:
		completed.emit(decoded)
	else:
		completed.emit({"ok": false, "error": "Invalid bridge response"})

func call_api(path: String, body: Variant = null) -> Dictionary:
	if pending:
		return {"ok": false, "error": "A request is already running"}
	pending = true
	var response: Dictionary = {}
	if OS.has_feature("web"):
		if bridge == null:
			pending = false
			return {"ok": false, "error": "Open the web export through the KULT Syndicates host."}
		bridge.request(JSON.stringify({"path": path, "body": body}), callback)
		response = await completed
	else:
		var headers = PackedStringArray(["Content-Type: application/json", "X-CSRF-Token: " + csrf, "X-Request-ID: " + Crypto.new().generate_random_bytes(16).hex_encode()])
		if not token.is_empty():
			headers.append("Authorization: Bearer " + token)
		var method = HTTPClient.METHOD_GET if body == null else HTTPClient.METHOD_POST
		var err = http.request(base_url + path, headers, method, "" if body == null else JSON.stringify(body))
		if err != OK:
			pending = false
			return {"ok": false, "error": "Could not reach the Syndicates server"}
		var raw = await http.request_completed
		var parsed = JSON.parse_string(raw[3].get_string_from_utf8())
		if raw[0] != HTTPRequest.RESULT_SUCCESS or not parsed is Dictionary:
			response = {"ok": false, "error": "API unavailable. Start the supplied backend first."}
		elif raw[1] >= 400:
			response = {"ok": false, "error": parsed.get("error", "Request rejected")}
		else:
			response = {"ok": true, "data": parsed}
	if response.get("ok", false):
		var data: Dictionary = response.get("data", {})
		csrf = str(data.get("csrf", csrf))
		token = str(data.get("token", token))
	pending = false
	return response
