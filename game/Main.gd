extends Node2D
## All outcomes, costs and persistence come from the service. This scene only renders and sends choices.
const API_SCRIPT = preload("res://Api.gd")
const INK = Color("14262c")
const PAPER = Color("f6f4e9")
const LIME = Color("d4ee73")
const MUTED = Color("acc3b6")
var api
var state: Dictionary = {}
var player = Vector2(3, 7)
var target = Vector2(3, 7)
var route: Array = []
var clock: float = 0.0
var map_origin = Vector2(425, 220)
var map_scale: float = 1.0
var ui: CanvasLayer
var side: VBoxContainer
var nav: HBoxContainer
var header: Label
var subheader: Label
var notice_label: Label
var side_panel: PanelContainer
var current_tab: String = "district"
var selected_job: String = ""
var markers: Array = []
var replay: Dictionary = {}
var replay_index: int = -1
var replay_elapsed: float = 0.0
var budget_input: SpinBox
var risk_input: CheckBox
var stop_input: CheckBox
var permission_inputs: Array = []
var ui_busy: bool = false
var social_elapsed: float = 0.0
var font: Font

func _ready() -> void:
	font = ThemeDB.fallback_font
	api = API_SCRIPT.new()
	add_child(api)
	_make_ui()
	await _connect_agent()

func _make_ui() -> void:
	ui = CanvasLayer.new()
	add_child(ui)
	header = _label("KULT  /  SYNDICATES", 25, PAPER)
	header.position = Vector2(30, 24)
	header.size.x = 1220
	ui.add_child(header)
	subheader = _label("THE SWITCHYARD · CONNECTING TO YOUR AGENT", 13, MUTED)
	subheader.position = Vector2(30, 65)
	subheader.size.x = 1220
	ui.add_child(subheader)
	nav = HBoxContainer.new()
	nav.position = Vector2(30, 106)
	nav.add_theme_constant_override("separation", 10)
	ui.add_child(nav)
	for item in ["district", "exchange", "passport", "crew", "permissions"]:
		var tab_name = str(item)
		nav.add_child(_button(tab_name.capitalize(), func(): _set_tab(tab_name)))
	nav.add_child(_button("World Home", _go_home))
	side_panel = PanelContainer.new()
	side_panel.position = Vector2(885, 165)
	side_panel.size = Vector2(365, 585)
	var style = StyleBoxFlat.new()
	style.bg_color = PAPER
	style.corner_radius_top_left = 14
	style.corner_radius_top_right = 14
	style.corner_radius_bottom_left = 14
	style.corner_radius_bottom_right = 14
	style.content_margin_left = 22
	style.content_margin_right = 22
	style.content_margin_top = 22
	style.content_margin_bottom = 22
	side_panel.add_theme_stylebox_override("panel", style)
	ui.add_child(side_panel)
	var scroll = ScrollContainer.new()
	scroll.custom_minimum_size = Vector2(315, 520)
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	side_panel.add_child(scroll)
	side = VBoxContainer.new()
	side.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	side.add_theme_constant_override("separation", 12)
	scroll.add_child(side)
	notice_label = _label("Click a building or the ground to walk. WASD / arrows to move.", 13, LIME)
	notice_label.position = Vector2(30, 758)
	notice_label.size = Vector2(1220, 32)
	ui.add_child(notice_label)

func _label(text: String, size_px: int = 15, color: Color = INK) -> Label:
	var label = Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", size_px)
	label.add_theme_color_override("font_color", color)
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.custom_minimum_size = Vector2(0, size_px + 8)
	return label

func _button(text: String, action: Callable) -> Button:
	var button = Button.new()
	button.text = text
	button.custom_minimum_size = Vector2(0, 43)
	button.add_theme_font_size_override("font_size", 14)
	button.add_theme_color_override("font_color", LIME)
	var style = StyleBoxFlat.new()
	style.bg_color = INK
	style.corner_radius_top_left = 6
	style.corner_radius_top_right = 6
	style.corner_radius_bottom_left = 6
	style.corner_radius_bottom_right = 6
	style.content_margin_left = 14
	style.content_margin_right = 14
	button.add_theme_stylebox_override("normal", style)
	var hover = style.duplicate()
	hover.bg_color = Color("355448")
	button.add_theme_stylebox_override("hover", hover)
	button.pressed.connect(action)
	return button

func _connect_agent() -> void:
	var result: Dictionary = await api.call_api("/api/state")
	if not result.get("ok", false):
		_clear_side()
		side.add_child(_label("Enter the Switchyard.", 27))
		side.add_child(_label("Open through KULT World for your existing Agent. Local demo mode creates a separate, labeled sandbox Agent."))
		side.add_child(_button("Start local sandbox", _demo_login))
		_message(str(result.get("error", "Session required")))
		return
	state = result["data"]
	if state.get("mission") != null:
		selected_job = ""
	_render()
	if OS.has_feature("web"):
		JavaScriptBridge.get_interface("SyndicatesBridge").ready()

func _demo_login() -> void:
	var result: Dictionary = await api.call_api("/api/session", {})
	if result.get("ok", false):
		await _connect_agent()
	else:
		_message(str(result.get("error", "Could not enter")))

func _message(text: String) -> void:
	notice_label.text = text

func _clear_side() -> void:
	for child in side.get_children():
		side.remove_child(child)
		child.queue_free()

func _set_tab(tab_name: String) -> void:
	current_tab = tab_name
	replay_index = -1
	_render()

func _render() -> void:
	if state.is_empty():
		return
	var a: Dictionary = state["agent"]
	header.text = "KULT  /  SYNDICATES                      " + str(a["name"])
	subheader.text = "THE SWITCHYARD · SEASON %02d     /     %s     /     %d SUPPLIES   %d INTEL   %d INFLUENCE" % [int(state["season"]), "SANDBOX" if a["mode"] == "demo" else "KULT CONNECTED", int(a["supplies"]), int(a["intel"]), int(a["influence"])]
	_clear_side()
	if current_tab == "passport":
		_render_passport()
	elif current_tab == "permissions":
		_render_policy()
	elif current_tab == "exchange":
		_render_exchange()
	elif current_tab == "crew":
		_render_crew()
	else:
		_render_mission()
	queue_redraw()

func _render_mission() -> void:
	var m = state.get("mission")
	if m == null:
		if selected_job != "":
			for job in state["missions"]:
				if str(job["kind"]) != selected_job:
					continue
				side.add_child(_label("REVIEW THE JOB", 12, Color("63816a")))
				side.add_child(_label(str(job["name"]), 28))
				side.add_child(_label(str(job["intro"])))
				side.add_child(_label("%d Supply entry · three choices · NPC opposition" % int(job["cost"]), 13))
				side.add_child(_label("Your cap: %d Supplies. The server records success, miss, or withdrawal." % int(state["agent"]["policy"]["maxSupplies"]), 12))
				var permitted = not state["agent"]["policy"]["stopped"] and selected_job in state["agent"]["policy"]["allowed"] and int(job["cost"]) <= int(state["agent"]["policy"]["maxSupplies"]) and int(job["cost"]) <= int(state["agent"]["supplies"])
				var commit = _button("Commit to this job", func(): _mutate("/api/missions", {"kind": selected_job}))
				commit.disabled = not permitted
				side.add_child(commit)
				if not permitted:
					side.add_child(_label("Blocked by your permissions or resources.", 12, Color("a65040")))
				side.add_child(_button("Choose another job", func(): _clear_selection()))
				return
		side.add_child(_label("THE JOB BOARD", 12, Color("63816a")))
		side.add_child(_label("Your Agent.\nYour next decision.", 28))
		side.add_child(_label("Four ways to shape the district. NPC opposition is labeled. Every attempt stays in the record."))
		for job in state["missions"]:
			var kind = str(job["kind"])
			side.add_child(_button(str(job["name"]) + " · " + str(job["cost"]) + " Supply", func(): _select_job(kind)))
		side.add_child(_button("Daily resupply", func(): _mutate("/api/resupply", {})))
		if not state["receipts"].is_empty():
			var last_receipt: Dictionary = state["receipts"][0]
			side.add_child(_label("Last result: " + str(last_receipt["outcome"]), 17))
			side.add_child(_button("Replay last mission", func(): _start_replay(last_receipt)))
		return
	side.add_child(_label(str(m["kind"]).to_upper() + " / " + str(m["faction"]) + " NPC", 12, Color("63816a")))
	if m["status"] == "PENDING":
		side.add_child(_label("The district responds.", 27))
		side.add_child(_label("Your choices are committed. Return for the result after the server's resolution window."))
		side.add_child(_button("Resolve committed mission", func(): _mutate("/api/missions/" + str(m["id"]) + "/resolve", {})))
		side.add_child(_label("Seed commitment\n" + str(m["commitment"]), 11))
		return
	side.add_child(_label(str(m["stage"]["title"]), 27))
	side.add_child(_label("CHOICE %d / 3 · %d SUPPLIES SPENT" % [int(m["step"]) + 1, int(m["spent"])], 12))
	side.add_child(_label(str(m["stage"]["text"])))
	for choice in m["stage"]["options"]:
		var option: Dictionary = choice
		var marker = "  ◇" if option["id"] == m["recommendation"]["action"] else ""
		var text = str(option["text"]) + marker + "\n%d Supply · %d Intel" % [int(option["supplies"]), int(option["intel"])]
		var button = _button(text, func(): _choose(str(option["id"])))
		button.custom_minimum_size.y = 66
		side.add_child(button)
	side.add_child(_label("◇ Rule-based adviser suggestion. You make the choice.", 12, Color("63816a")))
	side.add_child(_button("Withdraw — keep the record", func(): _mutate("/api/missions/" + str(m["id"]) + "/withdraw", {})))

func _select_job(kind: String) -> void:
	selected_job = kind
	current_tab = "district"
	_render()

func _clear_selection() -> void:
	selected_job = ""
	_render()

func _choose(choice_id: String) -> void:
	var m: Dictionary = state["mission"]
	await _mutate("/api/missions/" + str(m["id"]) + "/choice", {"step": int(m["step"]), "choice": choice_id})
	if state.get("mission") != null:
		var step = int(state["mission"]["step"])
		target = [Vector2(4, 5), Vector2(5, 4), Vector2(7, 6)][clampi(step - 1, 0, 2)]

func _mutate(path: String, body: Dictionary) -> void:
	if ui_busy:
		return
	ui_busy = true
	var result: Dictionary = await api.call_api(path, body)
	if result.get("ok", false):
		_message("Recorded by the server.")
		await _connect_agent()
	else:
		_message(str(result.get("error", "Request failed")))
	ui_busy = false

func _render_passport() -> void:
	side.add_child(_label("THE RECORD STAYS", 12, Color("63816a")))
	side.add_child(_label("Agent Passport", 28))
	side.add_child(_label("Syndicates evidence only. These are not Arena wins or trading credentials.", 13))
	if state["receipts"].is_empty():
		side.add_child(_label("Complete your first mission to begin the record."))
	for item in state["receipts"]:
		var r: Dictionary = item
		side.add_child(_button(str(r["missionType"]).capitalize() + " · " + str(r["outcome"]), func(): _start_replay(r)))
		side.add_child(_label(str(r["label"]) + " / " + str(r["opponent"]) + " / " + str(r["opponentType"]), 11))

func _start_replay(r: Dictionary) -> void:
	replay = r
	replay_index = 0
	replay_elapsed = 0.0
	_clear_side()
	side.add_child(_label("MISSION REPLAY", 12, Color("63816a")))
	side.add_child(_label(str(r["missionType"]).capitalize() + " / " + str(r["outcome"]), 27))
	for event in r["replay"]:
		side.add_child(_label("%02ds · %s" % [int(event["tick"]), str(event["text"])], 14))
	side.add_child(_label(str(r["label"]) + " · Ed25519 signed\n" + str(r["hash"]), 10))
	side.add_child(_button("Back to Passport", func(): _set_tab("passport")))

func _render_policy() -> void:
	var p: Dictionary = state["agent"]["policy"]
	side.add_child(_label("Your permission card", 26))
	side.add_child(_label("In-game authority only. No permission to trade, withdraw or spend money.", 13))
	side.add_child(_label("Maximum Supplies per mission"))
	budget_input = SpinBox.new()
	budget_input.min_value = 0
	budget_input.max_value = 20
	budget_input.value = p["maxSupplies"]
	side.add_child(budget_input)
	risk_input = CheckBox.new()
	risk_input.text = "Allow risky choices"
	risk_input.button_pressed = p["allowRisk"]
	risk_input.add_theme_color_override("font_color", INK)
	side.add_child(risk_input)
	permission_inputs = []
	for kind in ["scout", "negotiate", "defend", "heist"]:
		var box_input = CheckBox.new()
		box_input.text = str(kind).capitalize()
		box_input.set_meta("kind", kind)
		box_input.button_pressed = kind in p["allowed"]
		box_input.add_theme_color_override("font_color", INK)
		side.add_child(box_input)
		permission_inputs.append(box_input)
	stop_input = CheckBox.new()
	stop_input.text = "Emergency stop"
	stop_input.button_pressed = p["stopped"]
	stop_input.add_theme_color_override("font_color", Color("a65040"))
	side.add_child(stop_input)
	side.add_child(_button("Save permissions", _save_policy))

func _save_policy() -> void:
	var allowed: Array = []
	for box_input in permission_inputs:
		if box_input.button_pressed:
			allowed.append(box_input.get_meta("kind"))
	await _mutate("/api/policy", {"maxSupplies": int(budget_input.value), "allowRisk": risk_input.button_pressed, "stopped": stop_input.button_pressed, "allowed": allowed})

func _render_crew() -> void:
	side.add_child(_label("Your Syndicate", 27))
	var c = state.get("crew")
	if c == null:
		side.add_child(_label("Create a crew or enter an invitation. Local sandbox members are separate test Agents."))
		var crew_name = LineEdit.new()
		crew_name.placeholder_text = "Crew name"
		crew_name.max_length = 32
		side.add_child(crew_name)
		side.add_child(_button("Create crew", func(): _mutate("/api/crew/create", {"name": crew_name.text})))
		var invite = LineEdit.new()
		invite.placeholder_text = "8-character invitation"
		invite.max_length = 8
		side.add_child(invite)
		side.add_child(_button("Join crew", func(): _mutate("/api/crew/join", {"code": invite.text})))
		_render_future_crew()
		return
	side.add_child(_label(str(c["name"]), 22))
	side.add_child(_label("Invite: " + str(c["code"]) + "\nTreasury: " + str(c["treasury"]) + " Supplies"))
	for member in c["members"]:
		side.add_child(_label(str(member["name"]) + (" · Leader" if member["id"] == c["leader"] else "")))
	side.add_child(_button("Contribute 5 Supplies", func(): _mutate("/api/crew/deposit", {"amount": 5})))
	if c["leader"] == state["agent"]["id"]:
		for block in ["garden", "workshop"]:
			var block_id = str(block)
			side.add_child(_button("Claim " + block_id + " · 5 Supplies", func(): _mutate("/api/crew/claim", {"block": block_id})))
	side.add_child(_label("Claims require 4 crew Influence. Upkeep expires after 24 hours.", 12))
	_render_future_crew()

func _render_future_crew() -> void:
	side.add_child(_button("Play & hire in the Exchange", func(): _set_tab("exchange")))

func _social_permission(field: String) -> void:
	var p: Dictionary = state["social"]["policy"].duplicate()
	p[field] = not p[field]
	await _mutate("/api/social/policy", p)

func _confirm_social(title: String, text: String, action: Callable) -> void:
	var dialog = ConfirmationDialog.new()
	dialog.title = title
	dialog.dialog_text = text
	add_child(dialog)
	dialog.confirmed.connect(func(): action.call(); dialog.queue_free())
	dialog.canceled.connect(func(): dialog.queue_free())
	dialog.popup_centered(Vector2i(420, 200))

func _render_exchange() -> void:
	var social: Dictionary = state.get("social", {})
	if social.is_empty():
		return
	side.add_child(_label("PLAY & HIRE", 24))
	side.add_child(_label("Live human-directed tactics. Hiring uses game Supplies only. No real-money stakes.", 12))
	var permissions: Dictionary = social["policy"]
	side.add_child(_button("PvP: " + ("ON" if permissions["allowPvP"] else "OFF"), func(): _social_permission("allowPvP")))
	side.add_child(_button("Hiring: " + ("ON" if permissions["allowHiring"] else "OFF"), func(): _social_permission("allowHiring")))
	var duel = social.get("duel")
	if duel != null:
		side.add_child(_label(str(duel["hostName"]) + " vs " + str(duel.get("guestName", "Waiting")), 17))
		var seconds: int = maxi(0, int(duel["deadline"] - social["serverTime"]))
		side.add_child(_label(str(seconds) + " seconds remaining", 12))
		var duel_id: String = str(duel["id"])
		if duel["status"] == "ACTIVE":
			side.add_child(_label("Round %d / 3. Flank beats Feint; Feint beats Guard; Guard beats Flank." % (int(duel["round"])+1), 13))
			if duel["youLocked"]:
				side.add_child(_label("Choice locked. Waiting for your rival."))
			else:
				for tactic in ["flank", "feint", "guard"]:
					var chosen: String = str(tactic)
					var turn: int = int(duel["round"])
					side.add_child(_button(chosen.capitalize(), func(): _mutate("/api/pvp/choice", {"duelId": duel_id, "round": turn, "choice": chosen})))
			for round_data in duel["rounds"]:
				side.add_child(_label(str(round_data["host"]) + " / " + str(round_data["guest"]), 12))
		side.add_child(_button("Leave challenge", func(): _confirm_social("Leave duel?", "An active duel becomes a recorded forfeit. An unfilled lobby closes.", func(): _mutate("/api/pvp/leave", {"duelId": duel_id}))))
	else:
		side.add_child(_button("Open live challenge", func(): _mutate("/api/pvp/create", {})))
		for lobby in social["lobbies"]:
			var lobby_id: String = str(lobby["id"])
			side.add_child(_button("Challenge " + str(lobby["hostName"]), func(): _mutate("/api/pvp/join", {"duelId": lobby_id})))
		if social["lobbies"].is_empty():
			side.add_child(_label("No open challenges. Invite another real player.", 12))
	side.add_child(_label("POST AN ASSIGNMENT", 16))
	for kind in ["scout", "negotiate", "defend", "heist"]:
		var job_kind: String = str(kind)
		side.add_child(_button("Hire " + job_kind + " / 3 Supplies", func(): _confirm_social("Lock 3 Supplies?", "A proven Agent can accept this mission. Success pays; failure or expiry refunds.", func(): _mutate("/api/hiring/create", {"kind": job_kind, "fee": 3}))))
	side.add_child(_label("OPEN ASSIGNMENTS", 16))
	for offer in social["offers"]:
		var offer_id: String = str(offer["id"])
		var text: String = str(offer["kind"]) + " / " + str(offer["fee"]) + " Supplies"
		side.add_child(_button(text, func(): _confirm_social("Accept job?", "Requires one prior domain success. You cover mission costs. Complete the assigned job within 15 minutes to earn payment.", func(): _accept_assignment(offer_id))))
	for contract in social["contracts"]:
		var contract_id: String = str(contract["id"])
		side.add_child(_label(str(contract["kind"]) + " / " + str(contract["status"]) + " / " + str(contract["fee"]) + " Supplies", 12))
		if contract["status"] == "OPEN" and contract["buyer"] == state["agent"]["id"]:
			side.add_child(_button("Cancel & refund", func(): _mutate("/api/hiring/cancel", {"contractId": contract_id})))
		if contract["status"] == "ACCEPTED" and contract["provider"] == state["agent"]["id"]:
			side.add_child(_button("Continue assigned mission", func(): _set_tab("district")))
	side.add_child(_button("Review results in Passport", func(): _set_tab("passport")))

func _accept_assignment(contract_id: String) -> void:
	await _mutate("/api/hiring/accept", {"contractId": contract_id})
	if state.get("mission") != null:
		_set_tab("district")

func _poll_exchange() -> void:
	ui_busy = true
	await _connect_agent()
	ui_busy = false

func _go_home() -> void:
	if OS.has_feature("web"):
		JavaScriptBridge.eval("window.top.location.href='/home.html'", true)
	else:
		OS.shell_open("http://localhost:8787/home.html")

func iso(x: float, y: float, z: float = 0.0) -> Vector2:
	return map_origin + Vector2((x-y)*37.0, (x+y)*18.5-z) * map_scale

func _poly(points: Array, color: Color) -> void:
	draw_colored_polygon(PackedVector2Array(points), color)

func _box(x: float, y: float, w: float, d: float, h: float, front: Color, roof: Color) -> void:
	var a = iso(x,y)
	var b = iso(x+w,y)
	var c = iso(x+w,y+d)
	var q = iso(x,y+d)
	var height = Vector2(0, h * map_scale)
	_poly([q,c,c-height,q-height],front)
	_poly([b,c,c-height,b-height],Color("28433e"))
	_poly([a-height,b-height,c-height,q-height],roof)

func _tree(x: float, y: float) -> void:
	var p = iso(x,y)
	draw_rect(Rect2(p+Vector2(-2,-22),Vector2(4,25)), Color("274633"))
	for j in range(3):
		draw_rect(Rect2(p+Vector2(-12+j*2,-30-j*6),Vector2(24-j*4,15)),[Color("42674e"),Color("60835a"),Color("8daa6b")][j])

func _building(b: Dictionary) -> void:
	var x = float(b["x"])-0.6
	var y = float(b["y"])-0.6
	var h = 54.0 if b["kind"] == "heist" else 34.0
	_box(x,y,1.2,1.2,h,Color("728774"),Color("bdc9a8"))
	_box(x+0.12,y+0.12,0.96,0.96,h+6,Color("597462"),Color("d8d5b1"))
	var p = iso(x+1.2,y+0.3)
	for i in range(3):
		draw_rect(Rect2(p+Vector2(-i*9,-h+12+i*4),Vector2(6,8)),LIME)
	var entry = iso(x+0.6,y+1.2)
	draw_rect(Rect2(entry+Vector2(-6,-19),Vector2(12,19)),INK)
	draw_rect(Rect2(entry+Vector2(-7,-22),Vector2(14,3)),Color("f1c075"))
	if b["kind"] == "home":
		var flag = iso(x+0.7,y+0.6,h+15)
		draw_line(flag,flag+Vector2(0,-20),LIME,2)
		draw_rect(Rect2(flag+Vector2(1,-20),Vector2(13,9)),LIME)
	if b["kind"] == "territory":
		for j in range(3):
			var g = iso(x+0.2+j*0.25,y+0.4,h+9)
			draw_rect(Rect2(g+Vector2(-6,-4),Vector2(14,8)),Color("335a46"))
			draw_rect(Rect2(g+Vector2(-5,-8),Vector2(12,5)),Color("96ac70"))
	if b["kind"] == "heist":
		_poly([iso(x+0.2,y+0.2,h+7),iso(x+0.8,y+0.2,h+7),iso(x+0.8,y+0.85,h+7),iso(x+0.2,y+0.85,h+7)],Color("365b61"))
		var antenna = iso(x+1.0,y+0.3,h+6)
		draw_line(antenna,antenna+Vector2(0,-22),PAPER,2)
		draw_rect(Rect2(antenna+Vector2(-3,-24),Vector2(6,4)),LIME)
	if b["kind"] == "negotiate":
		_poly([iso(x+0.1,y+0.1,h+8),iso(x+1,y+0.1,h+8),iso(x+1,y+0.8,h+8),iso(x+0.1,y+0.8,h+8)],Color("c29c64"))
		draw_rect(Rect2(entry+Vector2(-17,-24),Vector2(34,5)),Color("ecdcaa"))

func _draw_agent(p: Vector2) -> void:
	var v = iso(p.x,p.y)
	var bob = sin(clock*5)*0.7
	draw_circle(v+Vector2(0,2),9,Color(0,0,0,0.2))
	draw_rect(Rect2(v+Vector2(-6,-16+bob),Vector2(12,13)),INK)
	draw_rect(Rect2(v+Vector2(-7,-26+bob),Vector2(14,12)),Color("d6deca"))
	draw_rect(Rect2(v+Vector2(-5,-23+bob),Vector2(10,7)),INK)
	draw_rect(Rect2(v+Vector2(-3,-21+bob),Vector2(6,2)),LIME)
	draw_rect(Rect2(v+Vector2(-5,-3),Vector2(3,6)),Color("9daf9b"))
	draw_rect(Rect2(v+Vector2(2,-3),Vector2(3,6)),Color("9daf9b"))
	var drone = v+Vector2(20,-33+sin(clock*2)*3)
	draw_rect(Rect2(drone,Vector2(7,5)),LIME)
	draw_string(font,v+Vector2(-11,-37),"YOU",HORIZONTAL_ALIGNMENT_LEFT,-1,10,LIME)

func _draw() -> void:
	draw_rect(Rect2(20,165,845,580),Color("1d3639"))
	for y in range(10):
		for x in range(10):
			var water = x == 4 and y != 3 and y != 7
			var col = Color("38776e") if water else (Color("586b5b") if (x+y)%2 else Color("4b6155"))
			_poly([iso(x,y),iso(x+1,y),iso(x+1,y+1),iso(x,y+1)],col)
			if water:
				var ripple = iso(x+0.3,y+0.5)+Vector2(sin(clock+y)*3,0)
				draw_line(ripple,ripple+Vector2(17,0),Color("75aa98"),1)
	if state.is_empty():
		return
	var objects: Array = []
	for block in state["blocks"]:
		objects.append({"depth":float(block["x"])+float(block["y"]),"kind":"building","data":block})
	for point in [Vector2(0,1),Vector2(1,0),Vector2(9,1),Vector2(9,8),Vector2(0,8),Vector2(2,8),Vector2(6,1)]:
		objects.append({"depth":point.x+point.y,"kind":"tree","data":point})
	objects.append({"depth":player.x+player.y+0.5,"kind":"agent","data":player})
	objects.sort_custom(func(a,b):return a["depth"] < b["depth"])
	for obj in objects:
		if obj["kind"] == "building":
			_building(obj["data"])
		elif obj["kind"] == "tree":
			_tree(obj["data"].x,obj["data"].y)
		else:
			_draw_agent(obj["data"])
	markers = []
	for block in state["blocks"]:
		var pos = iso(float(block["x"]),float(block["y"]),84)
		var title = str(block["name"]).to_upper()
		var width = font.get_string_size(title,HORIZONTAL_ALIGNMENT_LEFT,-1,11).x + 18
		var rect = Rect2(pos-Vector2(width/2,11),Vector2(width,24))
		draw_rect(rect,INK)
		draw_string(font,pos+Vector2(-width/2+9,6),title,HORIZONTAL_ALIGNMENT_LEFT,-1,11,PAPER)
		markers.append({"rect":rect.grow(8),"block":block})
	draw_string(font,Vector2(42,195),"SW / 01   ·   NPC DISTRICT",HORIZONTAL_ALIGNMENT_LEFT,-1,13,MUTED)
	draw_string(font,Vector2(42,720),"◇  LANTERN HOUSE / PROTECTED",HORIZONTAL_ALIGNMENT_LEFT,-1,12,MUTED)

func _unhandled_input(event: InputEvent) -> void:
	var pos = Vector2.ZERO
	var tapped = false
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		pos = event.position
		tapped = true
	elif event is InputEventScreenTouch and event.pressed:
		pos = event.position
		tapped = true
	if not tapped or pos.x > 865 or pos.y < 165 or state.is_empty():
		return
	for marker in markers:
		if marker["rect"].has_point(pos):
			var b: Dictionary = marker["block"]
			_walk_to(Vector2(float(b["x"]),float(b["y"])+1))
			if b["kind"] == "home":
				_message("Lantern House is protected. You cannot lose your home.")
			elif b["kind"] == "territory":
				_set_tab("crew")
			elif state.get("mission") == null:
				_select_job(str(b["kind"]))
			return
	var local = (pos-map_origin)/map_scale
	var a = local.x/37.0
	var b = local.y/18.5
	_walk_to(Vector2(clampf((a+b)/2.0,0,9),clampf((b-a)/2.0,0,9)))

func _walkable(p: Vector2i) -> bool:
	if p.x < 0 or p.y < 0 or p.x > 9 or p.y > 9:
		return false
	if p.x == 4 and p.y != 3 and p.y != 7:
		return false
	for block in state.get("blocks",[]):
		if p == Vector2i(int(block["x"]),int(block["y"])):
			return false
	return true

func _walk_to(destination: Vector2) -> void:
	var finish = Vector2i(destination.round())
	var directions = [Vector2i(0,1),Vector2i(1,0),Vector2i(0,-1),Vector2i(-1,0)]
	if not _walkable(finish):
		var found_neighbor = false
		for direction in directions:
			if _walkable(finish+direction):
				finish += direction
				found_neighbor = true
				break
		if not found_neighbor:
			return
	var start = Vector2i(player.round())
	var queue: Array = [start]
	var parents: Dictionary = {start:null}
	var cursor = 0
	while cursor < queue.size():
		var cell: Vector2i = queue[cursor]
		cursor += 1
		if cell == finish:
			break
		for direction in directions:
			var next: Vector2i = cell+direction
			if _walkable(next) and not parents.has(next):
				parents[next] = cell
				queue.append(next)
	if not parents.has(finish):
		return
	route = []
	var route_cell: Variant = finish
	while route_cell != null and route_cell != start:
		route.push_front(Vector2(route_cell))
		route_cell = parents[route_cell]
	if not route.is_empty():
		target = route.pop_front()

func _process(delta: float) -> void:
	clock += delta
	social_elapsed += delta
	if current_tab == "exchange" and social_elapsed >= 2.0 and not ui_busy and not api.pending:
		social_elapsed = 0.0
		_poll_exchange()
	var focused = get_viewport().gui_get_focus_owner()
	if not (focused is LineEdit or focused is TextEdit or focused is SpinBox):
		var v = Vector2(float(Input.is_physical_key_pressed(KEY_D) or Input.is_physical_key_pressed(KEY_RIGHT))-float(Input.is_physical_key_pressed(KEY_A) or Input.is_physical_key_pressed(KEY_LEFT)),float(Input.is_physical_key_pressed(KEY_S) or Input.is_physical_key_pressed(KEY_DOWN))-float(Input.is_physical_key_pressed(KEY_W) or Input.is_physical_key_pressed(KEY_UP)))
		if v.length() > 0 and route.is_empty() and player.distance_to(target) < 0.08:
			_walk_to(player.round()+Vector2(v.x+v.y,v.y-v.x))
	player = player.move_toward(target,delta*3)
	if player.distance_to(target) < 0.05 and not route.is_empty():
		target = route.pop_front()
	if replay_index >= 0:
		replay_elapsed += delta
		if replay_elapsed >= 1.3:
			replay_elapsed = 0.0
			var events: Array = replay.get("replay",[])
			if replay_index < events.size():
				var event: Dictionary = events[replay_index]
				var p: Array = event.get("position",[3,6])
				target = Vector2(float(p[0]),float(p[1]))
				_message(str(event["text"]))
				replay_index += 1
			else:
				replay_index = -1
	queue_redraw()
