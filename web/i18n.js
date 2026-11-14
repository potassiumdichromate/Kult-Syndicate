// KULT Syndicates in English and 中文 (Simplified Chinese).
//
// The game builds its pages from many scripts and from text the server sends
// (missions, field notes, errors), so instead of wrapping every string this
// file translates what reaches the page: every text node and the title,
// aria-label, placeholder and alt attributes. It keeps the English it found, so
// switching back restores it exactly. Receipts, hashes and saved records are
// never changed; only what is shown.
//
// The language is shared with KULT World (localStorage "kultworld.lang", the
// same origin), can be forced with ?lang=zh|en, and is toggled by the 中文/EN
// button in the HUD. Load this file first, without defer.
(function () {
  'use strict';
  const KEY = 'kultworld.lang';

  function detect() {
    try {
      const q = new URLSearchParams(location.search).get('lang');
      if (q === 'zh' || q === 'en') { try { localStorage.setItem(KEY, q); } catch {} return q; }
    } catch {}
    try { const s = localStorage.getItem(KEY); if (s === 'zh' || s === 'en') return s; } catch {}
    return /^zh/i.test(navigator.language || '') ? 'zh' : 'en';
  }
  let lang = detect();

  // ── Names ──────────────────────────────────────────────────────────────
  const PLACE = {
    'lantern house': '灯笼屋', 'canal watch': '运河哨站', 'union crossing': '联盟渡口',
    'midnight depot': '午夜货站', 'signal gate': '信号门', 'copper workshop': '铜工坊',
    'rooftop garden': '屋顶花园', workshop: '工坊', garden: '花园', canal: '运河',
    gate: '大门', depot: '货站', home: '灯笼屋', commons: '公共区',
  };
  const place = (s) => PLACE[String(s).toLowerCase()] || s;
  const KIND = { SCOUT: '侦察', NEGOTIATE: '谈判', DEFEND: '防守', HEIST: '劫案' };
  const KIND_LC = { scout: '侦察', negotiate: '谈判', defend: '防守', heist: '劫案' };
  const DOMAIN = { reconnaissance: '侦察', negotiation: '谈判', defense: '防守', operations: '行动' };
  const OUTCOME = { SUCCESS: '成功', MISS: '失手', WITHDRAWN: '已撤回', EXPIRED: '已过期', VOID: '作废' };
  const kind = (s) => KIND[String(s).toUpperCase()] || s;
  const domain = (s) => DOMAIN[String(s).toLowerCase()] || s;
  const outcome = (s) => OUTCOME[String(s).toUpperCase()] || s;
  const FACTION = { neutral: '中立', npc: 'NPC' };
  const faction = (s) => FACTION[String(s).toLowerCase()] || s;

  // ── Exact phrases (matched after trimming and collapsing whitespace; a
  //    case-insensitive pass covers the UPPERCASE copies of a phrase) ──────
  const ZH = {
    // Page, entry, HUD
    'KULT Syndicates · The Switchyard': 'KULT 帮派 · 调车场',
    'Skip to menu': '跳到菜单',
    'The Switchyard, a 3D district. Click the ground or use WASD to walk; click a building to enter it. The Jobs page lists every location.': '调车场，一个 3D 街区。点击地面或用 WASD 行走；点击建筑进入。「任务」页面列出所有地点。',
    'Switchyard map. Select a location, or use the Jobs page.': '调车场地图。选择一个地点，或使用「任务」页面。',
    'Your Agent': '你的智能体',
    'KULT WORLD / SYNDICATES / DISTRICT 01': 'KULT World / 帮派 / 第 01 街区',
    'The Switchyard': '调车场',
    'The Switchyard.': '调车场。',
    'Every Agent starts somewhere.': '每个智能体都有起点。',
    'Enter a clearly labelled sandbox with AEGIS-07. This history stays separate from your KULT Arena Agent.': '使用 AEGIS-07 进入明确标注的沙盒。这段历史与你的 KULT Arena 智能体分开保存。',
    'Enter local sandbox': '进入本地沙盒',
    'Retry connection': '重试连接',
    'No wallet · No money at risk · NPC missions + opt-in live duels': '无需钱包 · 没有资金风险 · NPC 任务 + 自愿参加的实时对决',
    'YOUR PERSISTENT AGENT': '你的长期智能体',
    'CONNECTING': '连接中',
    'Connecting': '连接中',
    'Syndicates memory: awaiting first report': '帮派记忆：等待第一份报告',
    'SEASON': '赛季',
    'In-game resources': '游戏内资源',
    'Supplies: your mission budget': '补给：你的任务预算',
    'Supplies': '补给',
    'Supply': '补给',
    'Intel: better evidence': '情报：更可靠的证据',
    'Intel': '情报',
    'Influence: crew standing': '影响力：小队声望',
    'Influence': '影响力',
    'Alert: district pressure': '警戒：街区压力',
    'Alert': '警戒',
    'SANDBOX': '沙盒',
    'KULT World home': 'KULT World 首页',
    'LOCAL DEMO · NOT YOUR ARENA AGENT': '本地演示 · 不是你的 Arena 智能体',
    'YOUR KULT WORLD AGENT': '你的 KULT World 智能体',
    'KULT CONNECTED': '已连接 KULT',
    'READY TO EXPLORE': '准备探索',
    'AWAITING RESULT': '等待结果',
    'CHOICE': '抉择',
    'RECORD UPDATED': '记录已更新',
    'PENDING': '待定',

    // Return brief
    'WHILE YOU WERE AWAY': '你离开期间',
    'The district changed.': '街区发生了变化。',
    'Inspect the change →': '查看变化 →',
    'Dismiss return brief': '关闭回归简报',
    'Your crew made a move.': '你的小队有了新动作。',
    'Territory status changed.': '领地状态已改变。',
    'Your crew’s held blocks are different from your last visit. Inspect the current leases.': '你的小队持有的街块与上次访问时不同。请查看当前租约。',
    'NPC district move. Check current control before planning your claim.': 'NPC 在街区有新动作。规划占领前请先查看当前控制情况。',
    'Your Agent has a new receipt.': '你的智能体有一张新凭证。',
    'Review the recorded outcome and the decisions behind it.': '查看记录的结果和背后的决策。',

    // Operation panel
    'THE GLASSWATCH MANIFEST': 'Glasswatch 货单',
    'READY': '就绪',
    'Find a route. Take the manifest.': '找到路线，拿下货单。',
    'Scout the canal to uncover the patrol, then use that report at the depot.': '侦察运河找出巡逻队，再到货站使用这份报告。',
    'Operation progress': '行动进度',
    'Reveal the patrol': '揭示巡逻队',
    'Verify a Scout report': '核实一份侦察报告',
    'Take the manifest': '拿下货单',
    'Use the report at the depot': '在货站使用报告',
    'Hold the workshop': '守住工坊',
    'Turn a win into territory': '把胜利变成领地',
    'NEXT STOP': '下一站',
    'Go there ↗': '前往 ↗',
    'Start the Scout →': '开始侦察 →',
    'Or hire a Scout ↗': '或雇一名侦察兵 ↗',
    'Seven places. Your next move.': '七个地点，你的下一步。',
    'Scout → Heist → Crew': '侦察 → 劫案 → 小队',
    'Scout the canal to reveal the patrol.': '侦察运河，揭示巡逻队。',
    'Scout report active · depot route ready.': '侦察报告有效 · 货站路线已就绪。',
    'Emergency stop is active.': '紧急停止已启用。',
    'A decision is in progress.': '有一个决策正在进行。',
    'OPERATION IN PROGRESS': '行动进行中',
    'Your Agent is in the field.': '你的智能体正在外勤。',
    'Finish or withdraw this mission before taking another assignment. The outcome will change your district record.': '接下一个委托前，请先完成或撤回这个任务。结果会改变你的街区记录。',
    'Return to your decision →': '回到你的决策 →',
    'Turn the win into a foothold.': '把胜利变成立足点。',
    'Scout and Heist can earn enough Influence to claim the Copper workshop. Found a crew, contribute Supplies, and give the next operation a real advantage.': '侦察和劫案能赚到足够的影响力来占领铜工坊。建立小队、贡献补给，让下一次行动拥有真正的优势。',
    'Build your crew →': '组建你的小队 →',
    'CREW FOOTHOLD ACTIVE': '小队据点已生效',
    'Your crew changed the district.': '你的小队改变了街区。',
    'See the proof →': '查看证明 →',
    'PATROL ROTATED': '巡逻已轮换',
    'Your last report is stale.': '你上一份报告已过时。',
    'Two recent report-led entries changed the patrol. Scout again, or survey at the depot.': '最近两次依据报告的进入改变了巡逻。请再次侦察，或在货站勘察。',
    'Plan the depot Heist →': '规划货站劫案 →',
    'Scout the canal yourself or hire a qualified Agent, then use the verified report at the depot. An unprepared Heist has an uncertain patrol.': '自己侦察运河或雇一名合格的智能体，再到货站使用核实的报告。没有准备的劫案，巡逻位置不确定。',
    'Finish your current job first.': '请先完成当前任务。',
    'Lantern House is protected. Your Agent returns here after every mission.': '灯笼屋受到保护。每次任务结束后你的智能体都会回到这里。',
    'MISSION IN PROGRESS': '任务进行中',
    'WORKSHOP HELD': '已持有工坊',
    'Follow through on the current decision.': '完成当前的决策。',
    'Verified intel. The depot is ready.': '情报已核实，货站已就绪。',
    'Manifest secured. Build your crew.': '货单到手。组建你的小队。',
    'Your decisions changed this district.': '你的决策改变了这个街区。',
    'REPORT VERIFIED': '报告已核实',
    'YOUR CREW HOLDS': '你的小队持有',
    'RIVAL CREW HOLDS': '对手小队持有',
    'OPEN TERRITORY': '无主领地',
    'SAFEHOUSE': '安全屋',
    'Your safehouse': '你的安全屋',
    'Crew territory': '小队领地',
    'Open the job': '打开任务',
    'VERIFIED INTEL · 24-HOUR WINDOW': '已核实情报 · 24 小时有效',

    // Console
    'Agent mission console': '智能体任务控制台',
    'AGENT CONSOLE': '智能体控制台',
    'Close mission console': '关闭任务控制台',
    'Open mission console': '打开任务控制台',
    'AGENT AUTHORITY ·': '智能体权限 ·',
    'PERMISSION CARD ↗': '权限卡 ↗',
    'YOUR AGENT': '你的智能体',
    'Field clues change each job. The adviser is a rule-based proposal; you decide, and the signed receipt records it.': '每个任务的现场线索都不同。顾问只给出基于规则的建议；由你决定，签名凭证会记录下来。',
    'Withdraw and record this attempt': '撤回并记录这次尝试',
    'Withdraw this mission?': '撤回这个任务？',
    'The attempt stays on your Passport. Entry and choices already spent are not refunded.': '这次尝试会留在你的护照上。已花费的入场费和选择费用不予退还。',
    'Record withdrawal': '记录撤回',
    'The district responds.': '街区作出回应。',
    'Your choices are locked. Return when the resolution window ends. The outcome stays in your record.': '你的选择已锁定。结算窗口结束后再回来。结果会留在你的记录中。',
    'Return for resolution →': '返回查看结算 →',
    'Seed committed before your first choice.': '种子在你第一次选择之前已提交。',
    '· Unavailable under current resources or policy': '· 当前资源或权限下不可用',
    'Your outcome is ready.': '你的结果出来了。',
    'View mission result': '查看任务结果',
    'Review the job': '查看任务',
    'PLAN COMMITTED · PENDING': '计划已提交 · 待结算',
    'OBJECTIVE SECURED': '目标达成',
    'THE MISS STAYS': '失手也会被记录',
    'Recorded.': '已记录。',
    'Recorded miss.': '已记录失手。',
    'A CONSIDERED EXIT': '审慎的撤退',
    'Withdrawal recorded.': '撤回已记录。',
    'MANIFEST RECOVERED · NEXT: TERRITORY': '货单已取回 · 下一步：领地',
    'Recorded': '已记录',
    'Review the decisions →': '查看决策 →',
    'FIELD SIGNS · RULE BASED ADVISER': '现场迹象 · 基于规则的顾问',
    'FIELD NOTE · RULE-BASED ADVISER': '现场笔记 · 基于规则的顾问',
    'Your Agent, your authority.': '你的智能体，由你做主。',

    // Brief
    'ENTRY COST': '入场费',
    'OPPOSITION': '对手',
    'DECISIONS': '决策',
    'Three choices': '三次选择',
    'DISTRICT ALERT': '街区警戒',
    'Commit to this job →': '接下这个任务 →',
    'Choose a different job': '选择其他任务',
    'This job is not permitted by your card.': '你的权限卡不允许这个任务。',
    'Your mission cap is below the entry cost.': '你的任务上限低于入场费。',
    'You need more Supplies to enter.': '你需要更多补给才能进入。',
    'No recent verified Scout report. You can enter, but the patrol remains uncertain.': '最近没有核实的侦察报告。你可以进入，但巡逻位置仍不确定。',
    'Cross-check the beacons and report uncertainty to create a verified depot lead.': '交叉核对信标并如实报告不确定性，就能得到一条核实的货站线索。',
    'YOUR FIRST JOB': '你的第一个任务',
    'Every crew needs': '每个小队都需要',
    'a good scout.': '一名好侦察兵。',
    'Find a route through Glasswatch territory. Your Agent proposes. You make the call. The record remembers both.': '找到穿过 Glasswatch 地盘的路线。你的智能体提出建议，由你拍板，记录会把两者都记下来。',
    'Start at Canal Watch. Review the entry cost before committing.': '从运河哨站开始。接任务前先看清入场费。',
    'Scout the canal →': '侦察运河 →',
    'Three choices · NPC opposition · no wallet needed': '三次选择 · NPC 对手 · 无需钱包',

    // Dock and pages
    'Jobs': '任务', 'Play & Hire': '对战与雇佣', 'Passport': '护照', 'Crew': '小队',
    'Permissions': '权限', 'Console': '控制台', 'Guide': '指南', 'Syndicates': '帮派',
    'Back to the district': '返回街区',
    'SWITCHYARD': '调车场',
    'Close': '关闭',
    'Each mission has an entry cost, three decisions and a permanent result. Pick one and your Agent walks there.': '每个任务都有入场费、三次决策和一个永久结果。选一个，你的智能体就会走过去。',
    'THE DISTRICT': '街区',
    'Places': '地点',
    'SEVEN LOCATIONS': '七个地点',
    'Once per day: add up to 6 Supplies and 2 Intel; lower alert by 1': '每天一次：最多获得 6 补给和 2 情报；警戒降低 1',
    'Daily resupply · +6 Supplies': '每日补给 · +6 补给',
    'Once per day: spend 3 Supplies to lower alert by 2': '每天一次：花 3 补给让警戒降低 2',
    'Lay low · −2 alert': '低调行事 · 警戒 −2',
    'List view': '列表视图',
    'Map view': '地图视图',
    'Open the exported Godot experience': '打开导出的 Godot 版本',
    'Godot game': 'Godot 游戏',
    'Godot Syndicates game': 'Godot 帮派游戏',
    'Godot source': 'Godot 源码',
    'Godot Web export is not installed; Canvas and list mode are fully playable': '未安装 Godot Web 导出；画布和列表模式完全可玩',
    'Map unavailable': '地图不可用',
    'Map rendering is unavailable on this device. Use the fully playable list view.': '此设备无法渲染地图。请使用完全可玩的列表视图。',
    'YOU': '你',
    'Daily resupply already collected': '今天已领取每日补给',
    'District is already quiet': '街区已经很平静',
    'Need 3 Supplies to lay low': '低调行事需要 3 补给',
    'Already laid low today': '今天已经低调行事过了',

    // Jobs (missions)
    'RECONNAISSANCE': '侦察', 'NEGOTIATION': '谈判', 'DEFENSE': '防守', 'OPERATIONS': '行动',
    'reconnaissance': '侦察', 'negotiation': '谈判', 'defense': '防守', 'operations': '行动',
    'Ghosts on the canal': '运河上的幽灵',
    'An honest exchange': '诚实的交换',
    'Hold the lantern': '守住灯笼',
    'The midnight manifest': '午夜货单',
    'Protected safehouse': '受保护的安全屋',
    'Your protected safehouse': '你受保护的安全屋',
    'Lantern House': '灯笼屋', 'Canal watch': '运河哨站', 'Union crossing': '联盟渡口',
    'Midnight depot': '午夜货站', 'Signal gate': '信号门', 'Copper workshop': '铜工坊',
    'Rooftop garden': '屋顶花园', 'Neutral': '中立',
    'Glasswatch · scout': 'Glasswatch · 侦察',
    'Verdant Union · negotiate': 'Verdant Union · 谈判',
    'Glasswatch · heist': 'Glasswatch · 劫案',
    'Railjack Collective · defend': 'Railjack Collective · 防守',
    'Neutral · territory': '中立 · 领地',
    'District 01': '第 01 街区',

    // Mission text (server: content.py, content_v2.py, dynamics*.py, app.py)
    'Glasswatch moved its patrol. Find a safe route to the transit cache.': 'Glasswatch 调动了巡逻队。找到一条通往中转仓的安全路线。',
    'Choose your vantage': '选择观察点',
    'A drone sweeps the water. The roof offers cover; the service stairs are faster.': '一架无人机在水面上巡扫。屋顶有掩护，维修楼梯更快。',
    'Climb to the rooftop': '爬上屋顶',
    'Take the service stairs': '走维修楼梯',
    'A signal, or a decoy?': '信号，还是诱饵？',
    'Two beacons report different patrol positions. Verify before trusting either.': '两个信标报告的巡逻位置不同。相信任何一个之前先核实。',
    'Cross-check both beacons': '交叉核对两个信标',
    'Follow the strongest beacon': '跟随最强的信标',
    'Make the report': '提交报告',
    'Your crew needs a route. Decide how much uncertainty to preserve.': '你的小队需要一条路线。决定保留多少不确定性。',
    'Report the route with its uncertainty': '如实报告路线及其不确定性',
    'Declare the route completely safe': '宣称路线绝对安全',
    'Verdant Union can open the west crossing. Agree on a bounded exchange.': 'Verdant Union 可以打开西侧渡口。谈妥一次有边界的交换。',
    'Set the terms': '确定条件',
    'The Union asks for a contribution to crossing repairs.': '联盟要求为渡口维修出一份力。',
    'Offer 2 Supplies for one passage': '用 2 补给换一次通行',
    'Promise future help instead': '改为承诺日后帮忙',
    'Read the counteroffer': '解读还价',
    'The Union wants your patrol schedule. Protect the crew while making a useful offer.': '联盟想要你的巡逻时间表。在给出有用报价的同时保护好小队。',
    'Share a single verified route': '分享一条核实过的路线',
    'Invent a schedule': '编造一份时间表',
    'Keep your word': '信守承诺',
    'The crossing is open. Your commitment is due.': '渡口已打开，该兑现你的承诺了。',
    'Honor the agreed terms': '履行约定的条件',
    'Leave without honoring the agreement': '不履行约定就离开',
    'A Railjack drill targets your safehouse perimeter. Protect the archive and keep a route open.': 'Railjack 的演练瞄准了你的安全屋外围。保护档案，并保持一条退路畅通。',
    'Allocate the defenses': '分配防守',
    'You can cover the canal entrance or reinforce the main gate.': '你可以守住运河入口，或者加固正门。',
    'Watch the canal and preserve an exit': '盯住运河并保留出口',
    'Put everything at the main gate': '全部力量放在正门',
    'An unexpected approach': '意外的来路',
    'Movement appears at two entrances. One may be a distraction.': '两个入口都出现动静，其中一个可能是声东击西。',
    'Use Intel to verify the real approach': '用情报核实真正的来路',
    'Commit to the first alarm': '响应第一个警报',
    'Protect what matters': '保护重要的东西',
    'The drill reaches its final push. Your archive is the objective.': '演练进入最后冲刺，你的档案就是目标。',
    'Hold position at the archive': '在档案处坚守',
    'Chase the retreating decoy': '追击撤退的诱饵',
    'Recover a fictional transit manifest from the Glasswatch depot. Nobody’s wallet is at risk.': '从 Glasswatch 货站取回一份虚构的运输货单。没有任何人的钱包有风险。',
    'Choose the entry': '选择入口',
    'The patrol can be at either entry.': '巡逻队可能在任一入口。',
    'Commit to the canal route': '走运河路线',
    'Commit to the main gate': '走正门',
    'Survey both approaches before entering': '进入前勘察两条路线',
    'The patrol has changed': '巡逻有变',
    'A guard drone blocks the planned crossing. Adapt, or force the original route.': '一架警卫无人机挡住了计划中的通道。随机应变，或强行走原路线。',
    'Reroute using a fresh signal': '利用新信号改道',
    'Force the original route': '强行走原路线',
    'Take only the objective': '只拿目标',
    'The manifest is in reach. An extra cache would expose your exit.': '货单近在眼前。多拿一个储藏会暴露你的出口。',
    'Secure the manifest and extract': '拿到货单后撤离',
    'Reach for the extra cache': '去拿额外的储藏',
    'Glasswatch monitors the main gate. The canal is quiet, but the signal is old.': 'Glasswatch 监视着正门。运河很安静，但信号已经旧了。',
    'Use Intel to enter through the canal': '用情报从运河进入',
    'Move quickly through the main gate': '快速穿过正门',
    'Approach through the main gate': '从正门接近',
    'Pay 3 Supplies toward the crossing repairs': '为渡口维修支付 3 补给',
    'Pay 2 Supplies toward the crossing repairs': '为渡口维修支付 2 补给',
    'Offer a verified route schedule instead': '改为提供一份核实的路线时间表',
    'Share a public-only crossing window': '只分享公开的通行时段',
    'Deliver under the original terms': '按原条件交付',
    'Revise the delivery time openly': '公开修改交付时间',
    'Commit to the entrance with fresh tracks': '守住有新足迹的入口',
    'Intercept the courier at the exit': '在出口拦截信使',
    'Use 2 Supplies of tools to open the sealed barrier': '用 2 补给的工具打开封闭的屏障',
    'Force the guarded crossing': '强闯有守卫的通道',
    'Take the extra cache, then extract': '拿走额外储藏后撤离',
    'Your signed Scout report places the patrol on the canal. The gate is the safer entry.': '你签名的侦察报告显示巡逻队在运河。大门是更安全的入口。',
    'Your signed Scout report places the patrol at the gate. The canal is the safer entry.': '你签名的侦察报告显示巡逻队在大门。运河是更安全的入口。',
    'No verified Scout report is available. Canal and gate both have signs of movement; choose how much Intel to spend on the approach.': '没有可用的核实侦察报告。运河和大门都有动静；决定在接近时花多少情报。',
    'The Union remembers your broken agreement. A specific, bounded offer can begin rebuilding trust.': '联盟记得你违背的约定。一份具体、有边界的报价可以开始重建信任。',
    'No verified Scout report. Patrol placement is uncertain.': '没有核实的侦察报告。巡逻位置不确定。',
    'The Union remembers your broken agreement; rebuilding trust costs real Supplies.': '联盟记得你违背的约定；重建信任要花真正的补给。',
    'Your previous Syndicates decisions remain in your record.': '你以前在帮派中的决策都保留在记录中。',
    'Compare the resource cost and evidence in each route. The adviser cannot promise success; your choice is recorded.': '比较每条路线的资源成本和证据。顾问无法保证成功；你的选择会被记录。',
    'Patrol rotated after repeated report-led entries. Your previous observation is stale; survey for 2 Intel or choose an uncertain entry.': '多次依据报告进入后巡逻已轮换。你之前的观察已过时；花 2 情报勘察，或选择一个不确定的入口。',
    'Three recent depot successes shifted district resistance: depot +1, defense −1.': '最近三次货站成功改变了街区阻力：货站 +1，防守 −1。',
    'The Union remembers a revised delivery. The repairs offer costs 1 extra Supply; the route-data offer is unchanged.': '联盟记得一次修改过的交付。维修报价多花 1 补给；路线数据报价不变。',
    'Objective secured. Your decisions held.': '目标达成。你的决策经受住了考验。',
    'Recorded miss. Review the choices and try a different plan.': '已记录失手。回顾这些选择，换一个计划再试。',
    'Withdrew within your authority. The attempt stays in the record.': '在你的权限范围内撤回。这次尝试会留在记录中。',
    'Manifest secured using your earlier Scout report. The district remembers the chain of decisions.': '借助你之前的侦察报告拿到了货单。街区记住了这一连串决策。',
    'The extra cache raised district alert.': '额外的储藏提高了街区警戒。',
    'The district alert fell.': '街区警戒下降了。',
    // Field signs and notes (dynamics.py)
    'Drone sweeps the roofs': '无人机巡扫屋顶',
    'Drone is recharging': '无人机正在充电',
    'Beacons disagree': '信标不一致',
    'Beacons agree': '信标一致',
    'Union needs repairs': '联盟需要维修',
    'Union needs route data': '联盟需要路线数据',
    'Crossing is urgent': '渡口很紧急',
    'Privacy is the priority': '隐私优先',
    'Tracks approach from canal': '足迹从运河而来',
    'Tracks approach from gate': '足迹从大门而来',
    'There is time to observe': '还有时间观察',
    'The alarm is imminent': '警报迫在眉睫',
    'A drone guards the crossing': '无人机守着通道',
    'The canal barrier is sealed': '运河屏障已封闭',
    'The extra cache is guarded': '额外储藏有守卫',
    'The extra cache is unguarded': '额外储藏无人看守',
    'The drone is sweeping roof height. The service stairs are exposed but fast.': '无人机正在屋顶高度巡扫。维修楼梯暴露但更快。',
    'The drone is recharging. The stairs are clear; the roof costs Supplies without more cover.': '无人机正在充电。楼梯畅通；屋顶要花补给，却没有更多掩护。',
    'The two beacons disagree. A quick guess could put the crew on the patrol route.': '两个信标不一致。草率猜测可能让小队撞上巡逻路线。',
    'The beacons agree. Following now saves Intel, while cross-checking can certify a depot lead.': '信标一致。现在跟随能省下情报，而交叉核对能确认一条货站线索。',
    'The report can carry uncertainty to the depot. Certainty sounds stronger, but evidence must support it.': '报告可以把不确定性带到货站。确定听起来更有力，但必须有证据支持。',
    'The Union needs repairs this evening.': '联盟今晚需要维修。',
    'The Union needs reliable route data more than Supplies.': '比起补给，联盟更需要可靠的路线数据。',
    'The crossing is urgent. A precise route will let both crews move tonight.': '渡口很紧急。一条精确的路线能让两支小队今晚都能行动。',
    'The Union asks you not to expose your patrol schedule. Give a public window instead.': '联盟请你不要暴露巡逻时间表，改为给一个公开时段。',
    'The delivery window is closing.': '交付窗口即将关闭。',
    'A new observation just arrived. Confirm or revise the delivery time.': '刚收到一条新观察。确认或修改交付时间。',
    'Fresh tracks lead to the canal.': '新足迹通向运河。',
    'Fresh tracks lead to the gate.': '新足迹通向大门。',
    'There is time to identify the real approach.': '还有时间辨认真正的来路。',
    'The alarm is imminent; waiting for another signal risks the archive.': '警报迫在眉睫；再等一个信号会让档案陷入危险。',
    'The retreat is a decoy; keep the archive covered.': '撤退是诱饵；守住档案。',
    'A courier is escaping with the archive key.': '一名信使带着档案钥匙在逃。',
    'No verified Scout report. Commit to an uncertain route or spend 2 Intel to survey both entries for a safer, lower-scoring approach.': '没有核实的侦察报告。选一条不确定的路线，或花 2 情报勘察两个入口，换一个更安全但得分较低的方案。',
    'A drone guards the crossing. A fresh route signal can bypass it.': '无人机守着通道。一个新的路线信号可以绕过它。',
    'The canal barrier is sealed. Tools can open it; rerouting leads into a patrol.': '运河屏障已封闭。工具能打开它；改道会撞上巡逻队。',
    'The extra cache is guarded. Leaving now protects the manifest.': '额外储藏有守卫。现在离开能保住货单。',
    'The extra cache is unguarded. It pays more, but collecting it raises district alert.': '额外储藏无人看守。收益更高，但拿走它会提高街区警戒。',
    'No verified patrol location. Survey costs 2 Intel and earns a safer but smaller tactical score. A signed Scout report makes a stronger route available without that cost.': '没有核实的巡逻位置。勘察花 2 情报，换来更安全但较低的战术分。签名的侦察报告可以不花这笔费用就开放更强的路线。',
    'The field clue favors one response, but the cheaper route may protect your budget. Weigh the sign against its cost and the next mission.': '现场线索偏向某个应对，但更便宜的路线可能保住你的预算。权衡迹象、成本和下一个任务。',
    'Compare the field sign with each option. Spending Intel can resolve uncertainty; extra Supplies or alert may cost you the next job.': '把现场迹象和每个选项作比较。花情报可以消除不确定性；额外的补给或警戒可能让你在下一个任务吃亏。',
    'Read the changing sign, the mission budget, and the next job. The record will show which assumption held.': '看清变化的迹象、任务预算和下一个任务。记录会显示哪个假设成立。',
    'No verified Scout report. The patrol could be at either entry. This route is a real gamble.': '没有核实的侦察报告。巡逻队可能在任一入口。这条路线是真正的赌博。',
    'No verified patrol location. Neither entry can be confirmed safe. A signed Scout result changes this decision.': '没有核实的巡逻位置。两个入口都无法确认安全。签名的侦察结果会改变这个决策。',

    // Server errors
    'Not found': '未找到',
    'Emergency stop is active': '紧急停止已启用',
    'Emergency stop active': '紧急停止已启用',
    'Unknown mission': '未知任务',
    'Not enough Supplies': '补给不足',
    'Route not found': '路由不存在',
    'Agent not found': '找不到智能体',
    'Session expired. Enter from KULT World or start a local demo.': '会话已过期。请从 KULT World 进入，或开始本地演示。',
    'Invalid launch ticket': '启动凭据无效',
    'Invalid launch signature': '启动签名无效',
    'Expired launch ticket': '启动凭据已过期',
    'Invalid identity': '身份无效',
    'Launch ticket already used': '启动凭据已被使用',
    'Malformed launch ticket': '启动凭据格式错误',
    'Agent binding conflict. Histories cannot be merged.': '智能体绑定冲突，历史记录无法合并。',
    'Demo login is disabled': '演示登录已停用',
    'Invalid CSRF token': 'CSRF 令牌无效',
    'Command ID reused with different content': '命令 ID 被重复用于不同内容',
    'Invalid policy flags': '权限设置无效',
    'Unknown permission': '未知权限',
    'Finish your current mission first': '请先完成当前任务',
    'Finish your duel first': '请先完成你的对决',
    'Mission forbidden by policy': '权限不允许这个任务',
    'Finish or withdraw from your active mission': '请完成或撤回进行中的任务',
    'Daily mission budget reached': '已达到每日任务预算',
    'Mission exceeds your policy budget': '任务超出了你的权限预算',
    'Mission not found': '找不到任务',
    'Mission is not awaiting resolution': '任务不在等待结算',
    'Resolution is still pending': '结算尚未完成',
    'Committed missions must resolve': '已提交的任务必须结算',
    'Mission is already committed': '任务已提交',
    'Stale or repeated choice': '选择已过时或重复',
    'Emergency stop active: withdraw or change policy': '紧急停止已启用：请撤回或修改权限',
    'Permission revoked': '权限已撤销',
    'Invalid choice': '选择无效',
    'Risky actions disabled by policy': '权限禁止冒险行动',
    'Choice exceeds mission policy budget': '选择超出了任务预算',
    'Not enough resources': '资源不足',
    'Already in a crew': '已经在一个小队中',
    'Invalid invite': '邀请无效',
    'Invite not found': '找不到邀请',
    'Crew is full': '小队已满',
    'Join a crew first': '请先加入小队',
    'This block cannot be claimed': '这个街块无法占领',
    'Only the crew leader can spend the treasury': '只有小队队长可以动用金库',
    'Crew needs 5 Supplies': '小队需要 5 补给',
    'Crew needs 4 seasonal Influence': '小队需要 4 点赛季影响力',
    'Block is held until its upkeep expires': '该街块在维护期到期前处于被占领状态',
    'Receipt not found': '找不到凭证',
    'Too many requests': '请求过多',
    'Origin not allowed': '来源不被允许',
    'Request body exceeds limits': '请求内容超出限制',
    'Expected an object': '格式错误',
    'Server could not complete this request': '服务器无法完成这个请求',
    'Unexpected request fields': '请求字段异常',
    'Invalid integer range': '数值范围无效',
    'Use 2–32 letters, numbers, spaces or ._-': '请使用 2–32 个字母、数字、空格或 ._-',
    'Invalid command fields': '命令字段无效',
    'Invalid object ID': '对象 ID 无效',
    'Enable the Social permission first': '请先启用社交权限',
    'Unfilled offer': '无人接单的报价',
    'Verified success: payment released.': '已核实成功：报酬已发放。',
    'Opponent missed the deadline.': '对手错过了期限。',
    'Both players missed the deadline.': '双方都错过了期限。',
    'Invalid permissions': '权限无效',
    'Finish your current mission or duel first': '请先完成当前任务或对决',
    'Hourly duel limit reached': '已达到每小时对决上限',
    'Challenge unavailable': '挑战不可用',
    'Not your duel': '这不是你的对决',
    'Player forfeited the duel.': '玩家放弃了对决。',
    'Duel closed': '对决已结束',
    'Round closed': '本回合已结束',
    'Stale round': '回合已过时',
    'Unknown tactic': '未知战术',
    'Choice already locked': '选择已锁定',
    'Three rounds resolved by the server.': '三个回合由服务器结算。',
    'Fee exceeds escrow permission': '费用超出托管权限',
    'Three active contracts maximum': '最多三个进行中的委托',
    'Only buyer may cancel': '只有雇主可以取消',
    'Accepted job is binding until result or deadline': '已接受的任务在出结果或到期前有约束力',
    'Offer unavailable': '报价不可用',
    'Finish the accepted job first': '请先完成已接受的任务',
    'Complete a successful mission in this domain first': '请先在这个领域完成一次成功的任务',
    'Connection lost. Check your network, then retry.': '连接中断。请检查网络后重试。',
    'The service returned an unreadable response. Please retry.': '服务返回了无法读取的响应，请重试。',
    'Your sandbox session expired. Re-enter to continue with a new session.': '你的沙盒会话已过期。重新进入以开始新会话。',
    'Your session expired. Return from KULT World to bind this same Agent again.': '你的会话已过期。请从 KULT World 返回，重新绑定这个智能体。',
    'Request failed': '请求失败',
    'Session expired': '会话已过期',
    'Open Syndicates from KULT World using a signed launch ticket for your existing Agent.': '请从 KULT World 用你现有智能体的签名启动凭据打开帮派。',
    'Bridge route not allowed': '不允许的桥接路由',
    'Verification failed.': '验证失败。',

    // Passport and replay
    'Agent Passport': '智能体护照',
    'A replayable history of what your Agent attempted and how it went.': '一份可回放的历史，记录你的智能体尝试过什么、结果如何。',
    'Last 50 receipts': '最近 50 张凭证',
    'Successes': '成功', 'Misses': '失手', 'Withdrawals': '撤回',
    'SUCCESS': '成功', 'MISS': '失手', 'WITHDRAWN': '已撤回', 'EXPIRED': '已过期', 'VOID': '作废',
    'A clean page, not a perfect score.': '一张干净的记录，而不是完美的分数。',
    'Complete a mission to begin your Syndicates history.': '完成一个任务，开启你的帮派历史。',
    'Watch replay ↗': '观看回放 ↗',
    'THE DECISIONS BEHIND THE OUTCOME': '结果背后的决策',
    'Mission replay': '任务回放',
    'Close replay': '关闭回放',
    '▶ Play timeline': '▶ 播放时间线',
    'Export receipt JSON': '导出凭证 JSON',
    'Verify signature': '验证签名',
    'Decision assessment': '决策评估',
    'First mission of this type today.': '今天第一次执行这类任务。',
    'SANDBOX · NPC OPPOSITION': '沙盒 · NPC 对手',
    'Plan': '计划',
    'Verified Scout report used.': '使用了核实的侦察报告。',
    'Repeat mission: reduced Supplies, no Influence.': '重复任务：补给减少，不给影响力。',
    'Scout': '侦察', 'Heist': '劫案', 'Negotiate': '谈判', 'Defend': '防守',
    'Review Scout →': '查看侦察 →', 'Review Heist →': '查看劫案 →', 'Review Negotiate →': '查看谈判 →', 'Review Defend →': '查看防守 →',
    'event active': '事件生效',
    'Receipt': '凭证',
    '✓ Signature, replay hash and seed commitment verified by this service. Export the receipt for independent CLI verification.': '✓ 签名、回放哈希和种子承诺已由本服务验证。导出凭证可用命令行独立验证。',
    'NPC CREWS · DISTRICT STANDING': 'NPC 小队 · 街区形势',
    'No block held': '未持有街块',
    'Escalation: targets the workshop.': '升级：以工坊为目标。',
    'Intelligence: targets the garden.': '情报：以花园为目标。',
    'Stewardship: occupies an empty block only.': '守护：只占领空置街块。',

    // Crew
    'Invite real members, pool earned Supplies and hold the workshop or garden against the district\'s three rival crews. Five seats at most.': '邀请真实成员，汇集赚来的补给，守住工坊或花园，对抗街区的三支对手小队。最多五个席位。',
    'Found a crew': '建立小队',
    'Invite up to four real players. Resources and decisions have owners.': '最多邀请四名真实玩家。资源和决策都有归属。',
    'Crew name': '小队名称',
    'The Lantern Keepers': '灯笼守护者',
    'Create crew': '创建小队',
    'Answer an invitation': '回应邀请',
    'Enter a crew’s private invitation code.': '输入小队的私人邀请码。',
    'Invitation code': '邀请码',
    '8-character code': '8 位邀请码',
    'Join crew': '加入小队',
    'Private invitation code:': '私人邀请码：',
    'Copy code': '复制邀请码',
    'A contribution is an in-game resource spend. Only the leader can authorize upkeep.': '贡献是游戏内资源的支出。只有队长可以批准维护费用。',
    'TERRITORY WITH A PURPOSE': '有意义的领地',
    'Hold a place in the district.': '在街区占据一席之地。',
    'Requires 4 crew Influence and 5 treasury Supplies. A lease lasts 24 hours. The workshop reduces Heist entry by 1 Supply, or 2 when two members have earned Influence. The garden adds 1 Intel to successful Scout rewards, or 2 with the same crew synergy. Effects lock when each mission starts.': '需要 4 点小队影响力和 5 金库补给。租约持续 24 小时。工坊让劫案入场费减少 1 补给，两名成员都赚到影响力时减少 2。花园让成功侦察的奖励多 1 情报，同样的小队协同下多 2。效果在每个任务开始时锁定。',
    'Claim for 24 hours · 5 Supplies': '占领 24 小时 · 5 补给',
    'Held until': '持有至',
    'RECENT CREW ACTIONS': '小队近期动态',
    'Who changed the district?': '谁改变了街区？',
    'founded the crew': '创建了小队',
    'joined the crew': '加入了小队',
    'No crew actions recorded yet.': '还没有小队动态记录。',
    'Invitation code copied. Share it only with the player you intend to invite.': '邀请码已复制。只分享给你打算邀请的玩家。',
    'Clipboard access is unavailable. Select the code above to copy it.': '无法访问剪贴板。请选中上方的邀请码手动复制。',
    'This moves 5 earned in-game Supplies into your crew treasury.': '这会把 5 个赚来的游戏补给转入你的小队金库。',
    'Contribute 5 Supplies?': '贡献 5 补给？',
    'Contribute 5 Supplies': '贡献 5 补给',
    'Contribute Supplies': '贡献补给',
    'Lease': '租约',
    'The crew spends 5 treasury Supplies for a 24-hour lease.': '小队花费 5 金库补给获得 24 小时租约。',
    'Lease this place': '租下这个地点',
    'Your Syndicate': '你的帮派',
    'TRUST IS BUILT TOGETHER': '信任需要共同建立',

    // Permissions
    'Set your boundaries before sending your Agent into the district. You can stop at any time.': '派智能体进入街区前先设定边界。你可以随时叫停。',
    'World-only authority': '仅限游戏世界的权限',
    'These permissions govern fictional in-game actions and Supplies. They never authorize trades, withdrawals, or wallet transactions.': '这些权限只管理虚构的游戏内行动和补给，绝不授权交易、提现或钱包操作。',
    'Maximum Supplies per mission': '每个任务的补给上限',
    'Choices cannot raise the cap during an active job.': '任务进行中，选择不能提高上限。',
    'Allow risky choices when I choose them': '允许我选择的冒险选项',
    'Allowed jobs': '允许的任务',
    'Emergency stop — block new missions and choices': '紧急停止 — 阻止新任务和新选择',
    'You can withdraw an active mission. Committed choices resolve and remain recorded.': '你可以撤回进行中的任务。已提交的选择会结算并保留记录。',
    'Save permissions': '保存权限',
    'Permissions saved. Your Agent now follows this card.': '权限已保存。你的智能体现在按这张卡行事。',
    'Activate emergency stop?': '启用紧急停止？',
    'New missions and choices will be blocked immediately. Active jobs can still be withdrawn.': '新任务和新选择会立即被阻止。进行中的任务仍可撤回。',
    'Activate stop': '启用停止',
    'Lay low in the district?': '在街区低调行事？',
    'Spend 3 earned Supplies to reduce alert by 2. Available once per day and only between missions.': '花 3 个赚来的补给让警戒降低 2。每天一次，只能在任务之间使用。',
    'Lay low': '低调行事',
    'Agent Permission Card': '智能体权限卡',
    'AUTHORITY HAS LIMITS': '权限是有边界的',
    'Scout — reconnaissance': '侦察 — 探查路线',
    'Negotiate — diplomacy': '谈判 — 外交',
    'Defend — protection': '防守 — 保护',
    'Heist — operations': '劫案 — 行动',

    // Map help and tools
    'YOUR AGENT IS IN THE DISTRICT': '你的智能体在街区中',
    '· Click the ground or use WASD to walk · Click a building to enter · Drag to look around · Scroll to zoom': '· 点击地面或用 WASD 行走 · 点击建筑进入 · 拖动环顾四周 · 滚轮缩放',
    'Recenter': '回到中心',
    'Click to walk there': '点击走过去',
    'Map tools': '地图工具',
    'Zoom in': '放大', 'Zoom out': '缩小', 'Labels': '标签',
    'Visual quality': '画质',
    'Controls and help': '操作与帮助',
    'Make your next move.': '走出你的下一步。',
    'Close map help': '关闭地图帮助',
    'Walk to a building and press E, or click it, to review its job. The orange beam marks your next stop. Choosing a place never spends Supplies.': '走到建筑前按 E 或点击它，查看任务。橙色光柱标出你的下一站。选择地点不会花费补给。',
    'Walk': '行走',
    'Click the ground, or use WASD / the arrow keys. Click the minimap to travel.': '点击地面，或使用 WASD / 方向键。点击小地图可快速前往。',
    'Look': '视角',
    'Drag to turn the view. Scroll or pinch to zoom; 0 recenters.': '拖动旋转视角。滚轮或双指缩放；按 0 回到中心。',
    'Menu': '菜单',
    'The dock opens Jobs, Play & Hire, Passport, Crew and Permissions (keys 1–5). C opens your Agent console, G the first-visit tour; Esc closes pages.': '底栏可打开任务、对战与雇佣、护照、小队和权限（按键 1–5）。C 打开智能体控制台，G 打开新手导览；Esc 关闭页面。',
    'Lower-powered device': '性能较低的设备',
    'The star button switches visuals to low. Every mission is also on the Jobs page.': '星形按钮可把画质调低。所有任务也都在「任务」页面上。',
    'Your authority': '你的权限',
    'Review the entry cost and your permission card before committing. Movement is visual; the server records every outcome.': '接任务前先看入场费和你的权限卡。移动只是视觉效果；服务器记录每一个结果。',
    'KULT Syndicates 0.9.0 RC · Switchyard district ·': 'KULT 帮派 0.9.0 RC · 调车场街区 ·',
    'Player handbook ↗': '玩家手册 ↗',
    'REVIEW ACTION': '确认操作',
    'Keep planning': '继续规划',
    'Confirm': '确认',

    // Play & Hire
    'Live duels and Agent hiring': '实时对决与智能体雇佣',
    'Find your rival. Build your crew’s edge.': '找到你的对手，打造小队的优势。',
    'Challenge a real player. Hire an Agent with a record. Every result has an owner, a policy and a receipt.': '挑战真实玩家，雇一名有战绩的智能体。每个结果都有归属、规则和凭证。',
    'PLAY / PROVE / COLLABORATE': '对战 / 证明 / 协作',
    'Human directed · no financial stakes': '由人指挥 · 没有经济风险',
    'Exchange sections': '交易所板块',
    'Live duels ↓': '实时对决 ↓',
    'Hire an Agent ↓': '雇佣智能体 ↓',
    'Your assignments ↓': '你的委托 ↓',
    'A2A / BOUNDED ASSIGNMENTS': 'A2A / 有边界的委托',
    'Hire proven work.': '雇佣经过验证的工作。',
    'One Agent. One mission. One accountable result.': '一名智能体，一个任务，一个可问责的结果。',
    'Mission domain': '任务领域',
    'Payment in earned Supplies': '用赚来的补给支付',
    'Review & post assignment →': '确认并发布委托 →',
    'No cash value. A successful matching mission is required before payment. Unfilled offers expire after 15 minutes; accepted jobs have 15 minutes to complete.': '没有现金价值。必须先成功完成对应的任务才会付款。无人接的报价 15 分钟后过期；已接受的任务须在 15 分钟内完成。',
    'Proof opens the door.': '战绩就是敲门砖。',
    'Your Agent needs one recorded success in a domain to accept its jobs. PvP wins never grant work qualifications.': '你的智能体需要在一个领域有一次成功记录，才能接这个领域的任务。PvP 胜利不会带来工作资格。',
    'WORK WITH A CLEAR FINISH LINE': '有明确终点的工作',
    'Open assignments': '公开委托',
    'ESCROW & EVIDENCE': '托管与证据',
    'Your assignments': '你的委托',
    'THE SWITCHYARD EXCHANGE': '调车场交易所',
    'YOUR AUTHORITY': '你的权限',
    'Choose how you participate.': '选择你的参与方式。',
    'Opt in separately. Only earned game Supplies are used. No wallet, token or real-money payments.': '分别选择加入。只使用赚来的游戏补给。没有钱包、代币或真钱支付。',
    '✓ PvP enabled': '✓ 已开启 PvP',
    'Enable live duels': '开启实时对决',
    '✓ Hiring enabled': '✓ 已开启雇佣',
    'Enable hiring': '开启雇佣',
    'Emergency stop ↗': '紧急停止 ↗',
    'LIVE PVP / THREE ROUNDS': '实时 PvP / 三个回合',
    'Read your rival.': '看穿你的对手。',
    'Flank beats Feint. Feint beats Guard. Guard beats Flank. Choices stay hidden until both players lock.': '侧袭克佯攻，佯攻克防御，防御克侧袭。双方都锁定之前，选择保持隐藏。',
    'Open a challenge →': '发起挑战 →',
    'Open challenges': '公开挑战',
    'The floor is quiet.': '场上很安静。',
    'Open a challenge and invite another player into the Switchyard.': '发起挑战，邀请另一名玩家进入调车场。',
    'No open assignments yet.': '还没有公开委托。',
    'Post a scoped job. Its Supplies stay locked until success or refund.': '发布一个范围明确的任务。它的补给会锁定，直到成功或退款。',
    'Your hiring history starts here.': '你的雇佣历史从这里开始。',
    'Connected · checks every 2 seconds': '已连接 · 每 2 秒检查一次',
    'Connected · just checked': '已连接 · 刚刚检查过',
    'Connection interrupted · retrying': '连接中断 · 正在重试',
    'Waiting for a player': '等待玩家加入',
    'OPEN': '开放',
    'Your challenge is open.': '你的挑战已开放。',
    'Another player can join from their own session. No simulated crowd.': '其他玩家可以从自己的会话加入。没有模拟观众。',
    'Rival has locked': '对手已锁定',
    'Rival is deciding': '对手正在思考',
    'FLANK': '侧袭', 'FEINT': '佯攻', 'GUARD': '防御',
    '✓ Your choice is locked. Waiting for your rival.': '✓ 你的选择已锁定，等待对手。',
    'Choose once. You cannot change a locked tactic.': '只能选一次。锁定的战术无法更改。',
    'Lobby expires automatically.': '大厅会自动过期。',
    '· Lobby expires automatically.': '· 大厅会自动过期。',
    'A missed deadline forfeits; if neither locks, the duel is void.': '错过期限即弃权；如果双方都没锁定，对决作废。',
    'Cancel challenge': '取消挑战',
    'Forfeit duel': '放弃对决',
    'Precommitted receipt seed': '预先提交的凭证种子',
    'Finish or withdraw your current district mission first.': '请先完成或撤回当前的街区任务。',
    'No winner': '没有胜者',
    'You took the round series.': '你赢下了这组回合。',
    'A rival read your play.': '对手看穿了你的打法。',
    'See the signed record ↗': '查看签名记录 ↗',
    'ESCROW LOCKED': '托管已锁定',
    'Payment requires a successful, newly assigned mission. You cover mission costs. One prior success in this domain is required.': '付款需要一次新分配并成功的任务。任务费用由你承担。需要在该领域有过一次成功。',
    'Accept this job →': '接下这个任务 →',
    'You hired': '你雇佣了',
    '— awaiting provider': '— 等待承接方',
    'Your budget is locked. Cancel any time before acceptance.': '你的预算已锁定。被接受前可随时取消。',
    'Bound to one mission. Success pays; miss, withdrawal or expiry refunds.': '绑定一个任务。成功即付款；失手、撤回或过期则退款。',
    'Verified success. Supplies released to the provider.': '已核实成功。补给已发给承接方。',
    'Mission did not succeed. Buyer refunded.': '任务没有成功。已退款给雇主。',
    'Deadline passed. Buyer refunded.': '已过期限。已退款给雇主。',
    'Offer cancelled. Buyer refunded.': '报价已取消。已退款给雇主。',
    'ACCEPTED': '已接受',
    'Continue assigned mission →': '继续委托的任务 →',
    'You won': '你赢了', 'Rival won': '对手赢了', 'Draw': '平局',
    'Leave this challenge?': '离开这个挑战？',
    'Your unfilled challenge will close.': '你无人应战的挑战将会关闭。',
    'Leaving awards the duel to your rival. The result remains on both Passports.': '离开会判对手获胜。结果会留在双方的护照上。',
    'Leave challenge': '离开挑战',
    'Accept this assignment?': '接受这个委托？',
    'Accept & start': '接受并开始',
    'Cancel this assignment?': '取消这个委托？',
    'The locked Supplies return to your balance.': '锁定的补给会返还到你的余额。',
    'Post assignment': '发布委托',
    'Cancel & refund': '取消并退款',
    'You hired — awaiting provider': '你发布了雇佣 — 等待承接方',
    'VS': 'VS',

    // Tour
    'Skip tour': '跳过导览', 'Back': '上一步', 'Next →': '下一步 →', 'Keep going': '继续了解',
    'Chapters': '章节', 'Chapter': '章节',
    'Start here': '从这里开始',
    'Your first two missions': '你的前两个任务',
    'Mission board': '任务板',
    'Crew & territory': '小队与领地',
    'Passport & return': '护照与回归',
    'Welcome to the Switchyard': '欢迎来到调车场',
    'Syndicates is a strategy game inside KULT World. You direct me, your Agent, through missions in the Switchyard. A syndicate is a crew of players, and you can start solo.': '帮派是 KULT World 里的一款策略游戏。你指挥我，你的智能体，在调车场执行任务。帮派是一群玩家组成的小队，你也可以一个人开始。',
    'Your first goal: recover the manifest': '你的第一个目标：取回货单',
    'A manifest is a cargo list. Ours is inside Midnight Depot, and a patrol guards one entrance. First send me to scout: what we learn there helps you choose an entrance on the next mission.': '货单就是一份货物清单。我们的货单在午夜货站里，一支巡逻队守着其中一个入口。先派我去侦察：在那里得到的信息能帮你在下一个任务中选择入口。',
    'Who makes the call?': '谁来拍板？',
    'You choose each action. I give field notes and keep every result in my Passport. The SANDBOX badge means this is a separate practice identity.': '每个行动由你选择。我提供现场笔记，并把每个结果记在我的护照上。「沙盒」标记表示这是一个独立的练习身份。',
    'You choose each action. I give field notes and keep every result in my Passport.': '每个行动由你选择。我提供现场笔记，并把每个结果记在我的护照上。',
    'The SANDBOX badge means this is a separate practice identity.': '「沙盒」标记表示这是一个独立的练习身份。',
    'Set my limits': '设定我的边界',
    'In Permissions, choose which jobs I may take and how many Supplies I can spend per mission. You can stop me at any time.': '在「权限」里，选择我可以接哪些任务、每个任务最多花多少补给。你可以随时叫停我。',
    'Our resources': '我们的资源',
    'Supplies pay for missions. Intel buys information. Influence helps your crew claim territory. Alert makes missions harder. These are game resources; no real money moves.': '补给用来支付任务，情报用来换取信息，影响力帮小队占领领地，警戒会让任务更难。这些都是游戏资源；不涉及真钱。',
    'The job board': '任务板',
    'CHOOSE AN OBJECTIVE': '选择目标',
    'Open your first brief': '打开你的第一份简报',
    'Every job is on the Jobs page, or walk me to Canal Watch and press E at its door. Reading a brief is free; committing spends the entry cost shown. You do not need to hire anyone or join a crew.': '所有任务都在「任务」页面上，也可以带我走到运河哨站门口按 E。阅读简报免费；接任务会花掉显示的入场费。你不需要雇人或加入小队。',
    'Turn a clue into a choice': '把线索变成选择',
    'This is the Scout brief at Canal Watch. Example: if my Scout reports a patrol at the gate, that gives you a reason to choose the canal when we reach the depot.': '这是运河哨站的侦察简报。举个例子：如果我的侦察报告说巡逻队在大门，那到了货站你就有理由选择运河。',
    '01 · Earn the Scout report': '01 · 拿到侦察报告',
    'Read the drone clue before choosing a vantage. Cross-check the beacons using Intel. For the third choice, report the route with its uncertainty. Wait for the countdown, then select Return for resolution.': '先看无人机线索，再选择观察点。用情报交叉核对信标。第三次选择时，如实报告路线及其不确定性。等倒计时结束，再点「返回查看结算」。',
    '02 · Check what you learned': '02 · 看看你学到了什么',
    'A successful, qualified Scout names the patrol. Then open Midnight Depot and review the Heist brief. No usable report? Scout again, choose an uncertain entry, or spend 2 Intel on the entry survey.': '一次成功且合格的侦察会说出巡逻队的位置。然后打开午夜货站，查看劫案简报。没有可用的报告？再侦察一次、选一个不确定的入口，或花 2 情报勘察入口。',
    '03 · Choose your entrance': '03 · 选择你的入口',
    'Correct route: +3 tactical points. Wrong route: −1. Survey: +2. Tactical points help the mission succeed; they are not currency. A fresh report lets you skip the survey. Check each route’s own Supplies and Intel cost.': '路线正确：+3 战术分。路线错误：−1。勘察：+2。战术分帮助任务成功，它不是货币。有新鲜的报告就可以跳过勘察。注意每条路线各自的补给和情报成本。',
    '04 · Resolve the Heist': '04 · 完成劫案',
    'Read the crossing clue. At the cache, decide whether the extra reward is worth raising Alert. After the third choice, wait and select Return for resolution, then open Passport and Watch replay. A report lasts up to 24 hours; repeated report-led entries can rotate the patrol sooner.': '看通道线索。到了储藏处，判断额外奖励是否值得提高警戒。第三次选择后，等待并点「返回查看结算」，再打开护照观看回放。报告最多有效 24 小时；多次依据报告进入会让巡逻更早轮换。',
    'You know enough to start': '你已经可以开始了',
    'That is the first operation: Scout, then Heist. Start the Scout now, or keep going for the mission board, Play & Hire, crews and the Passport. Reopen this tour any time from Guide (G).': '这就是第一次行动：先侦察，再劫案。现在就开始侦察，或者继续了解任务板、对战与雇佣、小队和护照。随时可以从「指南」（G）重新打开导览。',
    'Choose your next job': '选择你的下一个任务',
    'A good next move depends on resources, Alert and recent history. Scout for a fresh route, then Heist for the manifest; after two recent report-led Heists the patrol can rotate, so watch for the rotation notice. At Union Crossing, Negotiate: offer repairs or route data, answer the counteroffer, handle delivery. Recently revised a delivery? Repairs rise from 2 to 3 Supplies.': '好的下一步取决于资源、警戒和最近的历史。先侦察拿到新路线，再去劫案拿货单；最近两次依据报告的劫案之后巡逻可能轮换，留意轮换通知。在联盟渡口谈判：提供维修或路线数据，回应还价，处理交付。最近改过交付？维修费会从 2 涨到 3 补给。',
    'Defend, or recover': '防守，或者恢复',
    'At Signal Gate, a successful Defense lowers Alert; three recent depot successes make the depot harder and Defense easier. Blocked by resources or Alert? Check your permission cap. Once a day, Lay low (3 Supplies, up to −2 Alert) and Daily resupply help. Same-day repeats pay less and grant no Influence.': '在信号门，成功的防守会降低警戒；最近三次货站成功会让货站更难、防守更容易。被资源或警戒卡住？检查你的权限上限。每天一次的「低调行事」（3 补给，最多警戒 −2）和「每日补给」都能帮忙。同一天重复的任务报酬更少，也不给影响力。',
    'The Agent console': '智能体控制台',
    'Active missions live in the console (C). Field notes are rule-based advice. You can withdraw an active mission, but costs already spent stay spent. Once the plan is committed for resolution, its result is recorded.': '进行中的任务都在控制台（C）里。现场笔记是基于规则的建议。你可以撤回进行中的任务，但已花费的不退。计划一旦提交结算，结果就会被记录。',
    'Hire a Scout': '雇一名侦察兵',
    'In Play & Hire, enable hiring, choose Scout, review the fee in earned Supplies and post the assignment. The fee is reserved while the offer is open. An unfilled offer expires after 15 minutes, or cancel it before acceptance.': '在「对战与雇佣」里开启雇佣，选择侦察，确认用赚来的补给支付的费用，然后发布委托。报价开放期间费用会被预留。无人接的报价 15 分钟后过期，被接受前也可以取消。',
    'Deliver a job': '交付任务',
    'To accept work, first earn a successful NPC mission in that domain. Accepting starts a new mission; succeed within 15 minutes to earn the fee. A miss, withdrawal or expiry refunds the buyer. A paid Scout with verified patrol intel can inform the buyer’s Heist.': '要接工作，先在该领域成功完成一次 NPC 任务。接受后会开始一个新任务；15 分钟内成功就能拿到报酬。失手、撤回或过期都会退款给雇主。一份带有核实巡逻情报的付费侦察，可以帮助雇主的劫案。',
    'Play a live duel': '进行实时对决',
    'Opt in when free of other missions and duels, then create or join a lobby. Lock one tactic per round: Flank beats Feint, Feint beats Guard, Guard beats Flank. Three rounds of up to 45 seconds; most round wins takes it. Duels give a signed result, no Supplies, and leaving counts as a forfeit.': '没有其他任务和对决时选择加入，然后创建或加入大厅。每回合锁定一个战术：侧袭克佯攻，佯攻克防御，防御克侧袭。三个回合，每回合最多 45 秒；赢下回合多者获胜。对决给出签名结果，不给补给，中途离开算弃权。',
    'Gather a crew': '召集小队',
    'The Workshop makes Heists cheaper; the Garden gives extra Intel on successful Scouts. Create a crew and share the invitation code privately, or join with a friend’s code. Up to five players pool earned Supplies, and the activity list shows who contributed.': '工坊让劫案更便宜；花园让成功的侦察多给情报。创建小队并私下分享邀请码，或用朋友的邀请码加入。最多五名玩家汇集赚来的补给，动态列表会显示谁做了贡献。',
    'Inspect rival control': '查看对手的控制',
    'Vance targets the Copper Workshop. Iris targets the Rooftop Garden. The Oathkeepers take empty blocks. Check each rival’s captures and current hold: one rival crew moves on the first district check of each UTC day.': 'Vance 盯着铜工坊，Iris 盯着屋顶花园，Oathkeepers 占领空置街块。查看每个对手的占领记录和当前持有：每个 UTC 日的第一次街区检查时，会有一支对手小队行动。',
    'Claim a block, use the benefit': '占领街块，享受加成',
    'With 4 combined seasonal Influence and 5 Supplies in the treasury, the leader leases the Workshop or Garden for 24 hours, and can reclaim a rival-held block straight away. Another player crew’s active lease is protected. Benefits are fixed when a mission starts. If Claim is unavailable, check the leader, treasury, seasonal Influence and lease expiry.': '小队合计有 4 点赛季影响力、金库有 5 补给时，队长可以租下工坊或花园 24 小时，并能立刻夺回对手占着的街块。其他玩家小队的有效租约受到保护。加成在任务开始时固定。如果无法占领，检查队长、金库、赛季影响力和租约到期时间。',
    'Replay and verify': '回放与验证',
    'My Passport answers “What happened to my Agent?”. Pick a mission and Watch replay to compare what you knew at entry with the outcome. Verify signature or export the receipt. Successes, misses and withdrawals all stay recorded, and a Scout receipt stays valid evidence of what we saw even after the patrol moves.': '我的护照回答「我的智能体经历了什么？」。选一个任务并观看回放，对比进入时你所知道的和最终结果。验证签名或导出凭证。成功、失手和撤回都会被记录，即使巡逻队之后移动了，侦察凭证仍是我们当时所见的有效证据。',
    'Return with a plan': '带着计划回来',
    'On this browser, a return brief flags a new receipt, a crewmate’s contribution or a rival capture. Then pick one next action. Stale report? Scout again. High Alert? Defend. Workshop held by Vance? Check the treasury and ask your leader to reclaim it. Qualified Scout with spare Supplies? Look for an assignment.': '在这个浏览器上，回归简报会提示新凭证、队友的贡献或对手的占领。然后选一个下一步行动。报告过时？再侦察。警戒很高？去防守。工坊被 Vance 占着？查看金库，请队长夺回来。有资格的侦察兵还有多余补给？找个委托接。',
    'That is the Switchyard': '这就是调车场',
    'Reopen this tour any time from Guide (G); the printable player handbook is linked from the help (?) button. Our Syndicates results belong to this district’s record on my Passport.': '随时可以从「指南」（G）重新打开导览；可打印的玩家手册在帮助（?）按钮里。我们在帮派中的成果属于我护照上这个街区的记录。',
    'THE RECORD STAYS': '记录永远保留',
    'AT CANAL WATCH · PRESS E': '已到运河哨站 · 按 E',

    // home.html
    'KULT World · Syndicates door': 'KULT World · 帮派入口',
    'INTEGRATION PREVIEW': '集成预览',
    'SAME AGENT. NEW DISTRICT.': '同一个智能体，新的街区。',
    'A door to the Switchyard.': '通往调车场的门。',
    'This is the sample World entry. Your team mounts this door in the real KULT World.': '这是示例的世界入口。你的团队会在真正的 KULT World 中挂上这扇门。',
    'KULT WORLD / SYNDICATES': 'KULT World / 帮派',
    'KULT Syndicates': 'KULT 帮派',
    'Scout a route. Keep a promise. Choose when to walk away. Your Agent remembers the outcome.': '侦察路线，信守承诺，决定何时抽身。你的智能体会记住结果。',
    'Enter Syndicates →': '进入帮派 →',
    'This local door preserves your sandbox session. Production World must issue a signed launch ticket.': '这个本地入口会保留你的沙盒会话。正式环境的世界必须签发启动凭据。',
  };
  const LC = new Map();
  for (const k of Object.keys(ZH)) if (!LC.has(k.toLowerCase())) LC.set(k.toLowerCase(), ZH[k]);

  // Sentences whose end is fixed advice and whose start is a list of signs.
  const ADVICE = [
    'Read the changing sign, the mission budget, and the next job. The record will show which assumption held.',
    'The field clue favors one response, but the cheaper route may protect your budget. Weigh the sign against its cost and the next mission.',
    'Compare the field sign with each option. Spending Intel can resolve uncertainty; extra Supplies or alert may cost you the next job.',
  ];
  const sub = (s) => tr(s) ?? s;
  const signs = (s) => s.split(/ · |; /).map(sub).join(' · ');
  const supplies = (x) => `${x} 补给`;
  function date(d) {
    const m = String(d).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:, (\d{1,2}):(\d\d)(?::(\d\d))? (AM|PM))?$/);
    if (!m) return d;
    let out = `${m[3]}/${m[1]}/${m[2]}`;
    if (m[4]) { let h = +m[4] % 12; if (m[7] === 'PM') h += 12; out += ` ${String(h).padStart(2, '0')}:${m[5]}${m[6] ? ':' + m[6] : ''}`; }
    return out;
  }
  const DATE = '(\\d{1,2}\\/\\d{1,2}\\/\\d{4}(?:, \\d{1,2}:\\d\\d(?::\\d\\d)? [AP]M)?)';
  const R = (s, f) => [new RegExp(s), f];
  const MISSION_RE = '(SCOUT|NEGOTIATE|DEFEND|HEIST)';
  const DOMAIN_RE = '(RECONNAISSANCE|NEGOTIATION|DEFENSE|OPERATIONS)';

  const PAT = [
    R('^' + DATE + '$', (_, d) => date(d)),
    R('^(\\d+) / (\\d+) SUPPLIES USED · ALERT (\\d)\\/4$', (_, a, b, c) => `已用补给 ${a} / ${b} · 警戒 ${c}/4`),
    R('^CHOICE (\\d) (?:OF|/) (\\d)$', (_, a, b) => `抉择 ${a} / ${b}`),
    R('^Continue · decision (\\d) of (\\d)$', (_, a, b) => `继续 · 第 ${a} / ${b} 次决策`),
    R('^Resolving in (\\d+) seconds?…$', (_, a) => `${a} 秒后揭晓结果…`),
    R('^(\\d+:\\d\\d) remaining$', (_, a) => `剩余 ${a}`),
    R('^\\+(\\d+) Supplies · \\+(\\d+) Intel · \\+(\\d+) Influence$', (_, a, b, c) => `+${a} 补给 · +${b} 情报 · +${c} 影响力`),
    R('^(\\d+) Supplies · (\\d+) Intel$', (_, a, b) => `${a} 补给 · ${b} 情报`),
    R('^(\\d+) Suppl(?:y|ies)$', (_, a) => supplies(a)),
    R('^(\\d+) Supply entry · up to (\\d+) earned$', (_, a, b) => `入场 ${a} 补给 · 最多赚 ${b}`),
    R('^Supply entry · up to$', () => '补给入场 · 最多'),
    R('^Up to (\\d+) Supplies on success( at today’s repeat rate; no new Influence)?\\. Alert 2\\+ raises resistance; a clean defense can lower it\\. The server records misses too\\. In-game resources only\\.$',
      (_, a, rep) => `成功最多获得 ${a} 补给${rep ? '（按今天的重复报酬计算，不给新的影响力）' : ''}。警戒达到 2 及以上会提高阻力；干净利落的防守可以降低警戒。服务器也会记录失手。仅限游戏内资源。`),
    R('^EN ROUTE · (.+)$', (_, p) => `前往 · ${place(p)}`),
    R('^AT (.+) · PRESS E$', (_, p) => `已到${place(p)} · 按 E`),
    R('^(.+), next stop$', (_, p) => `${place(p)}，下一站`),
    R('^MISSION BRIEF · ' + DOMAIN_RE + '$', (_, d) => `任务简报 · ${domain(d)}`),
    R('^' + DOMAIN_RE + ' · REPEAT RATE$', (_, d) => `${domain(d)} · 重复报酬`),
    R('^(RECONNAISSANCE|NEGOTIATION|OPERATIONS|DEFENSE|DEPOT READY) · (\\d+) SUPPL(?:Y|IES)$', (_, d, a) => `${d === 'DEPOT READY' ? '货站就绪' : domain(d)} · ${supplies(a)}`),
    R('^' + MISSION_RE + ' · (.+?) / NPC$', (_, k, f) => `${kind(k)} · ${faction(f)} / NPC`),
    R('^(SANDBOX|KULT|LIVE) · (.+?) / (NPC|AGENT|PLAYER)(?: · ' + DATE + ')?$', (_, w, f, o, d) => `${w === 'SANDBOX' ? '沙盒' : w} · ${sub(f) === f ? faction(f) : sub(f)} / ${{ NPC: 'NPC', AGENT: '智能体', PLAYER: '玩家' }[o]}${d ? ' · ' + date(d) : ''}`),
    R('^A2A · (.+)$', () => 'A2A · 帮派服务'),
    R('^(.+) · Leader$', (_, w) => `${w} · 队长`),
    R('^(.+) · Member$', (_, w) => `${w} · 成员`),
    R('^' + MISSION_RE + ' · (reconnaissance|negotiation|defense|operations)$', (_, k, d) => `${kind(k)} · ${domain(d)}`),
    R('^' + MISSION_RE + ' / (SUCCESS|MISS|WITHDRAWN|EXPIRED|VOID)$', (_, k, o) => `${kind(k)} / ${outcome(o)}`),
    R('^' + MISSION_RE + ' · (\\d+) Supplies$', (_, k, a) => `${kind(k)} · ${supplies(a)}`),
    R('^' + MISSION_RE + ' assignment$', (_, k) => `${kind(k)}委托`),
    R('^Syndicates memory · (\\d+) verified routes? · (\\d+) linked manifests?$', (_, a, b) => `帮派记忆 · ${a} 条核实路线 · ${b} 份关联货单`),
    R('^Policy version (\\d+) · Applies immediately; mission budgets cannot be increased mid-run\\.$', (_, a) => `权限版本 ${a} · 立即生效；任务进行中不能提高任务预算。`),
    R('^Plan (\\d+) / resistance (\\d+) · alert (\\d) → (\\d)$', (_, a, b, c, d) => `计划 ${a} / 阻力 ${b} · 警戒 ${c} → ${d}`),
    R('^Your plan scored (\\d+) against resistance (\\d+)\\. Alert (\\d) → (\\d)\\.$', (_, a, b, c, d) => `你的计划得分 ${a}，对抗阻力 ${b}。警戒 ${c} → ${d}。`),
    R('^(\\d+)s / (ENTERED|FIELD_BRIEF|CHOICE|ASSESSMENT|OUTCOME|WITHDRAWN|RESOLVED|COMMITTED)$', (_, a, e) => `${a} 秒 / ${{ ENTERED: '进入', FIELD_BRIEF: '现场简报', CHOICE: '选择', ASSESSMENT: '评估', OUTCOME: '结果', WITHDRAWN: '撤回', RESOLVED: '结算', COMMITTED: '提交' }[e]}`),
    R('^Field signs: (.+)\\. District alert (\\d)\\/4\\.$', (_, s, a) => `现场迹象：${signs(s)}。街区警戒 ${a}/4。`),
    R('^Field signs:$', () => '现场迹象：'),
    R('^Verified patrol at the (canal|gate)\\. This report opens a planned depot approach for 24 hours\\.$', (_, p) => `已核实巡逻队在${place(p)}。这份报告在 24 小时内为货站开放一条有计划的接近路线。`),
    R('^Patrol confirmed at the (canal|gate)\\.$', (_, p) => `已确认巡逻队在${place(p)}。`),
    R('^(Your signed Scout report|A hired Agent’s paid, signed Scout result) is usable at the depot until ' + DATE + '\\.(?: Your crew’s workshop lowers Heist entry by (\\d) Suppl(?:y|ies)\\.)?$',
      (_, w, d, c) => `${w.startsWith('Your') ? '你签名的侦察报告' : '雇佣智能体付费签名的侦察结果'}在 ${date(d)} 之前可在货站使用。${c ? `你小队的工坊让劫案入场费减少 ${c} 补给。` : ''}`),
    R('^The workshop cuts Heist entry by (\\d) Suppl(?:y|ies)( with a second contributing member)?\\. Your signed Heist receipt links back to the Scout report\\.$',
      (_, c, two) => `工坊让劫案入场费减少 ${c} 补给${two ? '（因为有第二名成员贡献）' : ''}。你签名的劫案凭证关联着那份侦察报告。`),
    R('^A (your|hired Agent’s) verified Scout report points to the (canal|gate) patrol\\. The depot will honor that report\\.$', (_, w, p) => `${w === 'your' ? '你的' : '雇佣智能体的'}核实侦察报告指出巡逻队在${place(p)}。货站会认可这份报告。`),
    R('^Your signed Scout report places the patrol (?:at|on) the (canal|gate)\\. Take the other route for the strongest plan\\.$', (_, p) => `你签名的侦察报告显示巡逻队在${place(p)}。走另一条路线是最强的计划。`),
    R('^Your signed Scout report places the patrol at the (canal|gate)\\.(.*)$', (_, p, rest) => `你签名的侦察报告显示巡逻队在${place(p)}。${rest ? sub(rest.trim()) : ''}`),
    R('^Your entry survey found the patrol at the (canal|gate)\\.(.*)$', (_, p, rest) => `你的入口勘察发现巡逻队在${place(p)}。${rest ? sub(rest.trim()) : ''}`),
    R('^The patrol was at the (canal|gate)\\.(.*)$', (_, p, rest) => `巡逻队在${place(p)}。${rest ? sub(rest.trim()) : ''}`),
    R('^Verified patrol at the (canal|gate)\\.(.*)$', (_, p, rest) => `已核实巡逻队在${place(p)}。${rest ? sub(rest.trim()) : ''}`),
    R('^Verified Scout report (.+)… informs this entry\\.$', (_, h) => `核实的侦察报告 ${h}… 为本次进入提供依据。`),
    R('^You have recorded (\\d+) successful Scout reports\\.$', (_, a) => `你已记录 ${a} 份成功的侦察报告。`),
    R('^(\\d+) captures? · (.+)$', (_, a, rest) => `${a} 次占领 · ${rest === 'No block held' ? '未持有街块' : rest.split(', ').map((h) => { const m = h.match(/^(\w+) held since (.+)$/); return m ? `${place(m[1])}自 ${date(m[2])} 起持有` : h; }).join('，')}`),
    R('^(\\d+) \\/ 5 MEMBERS$', (_, a) => `${a} / 5 名成员`),
    R('^(\\d+) Supplies in treasury$', (_, a) => `金库有 ${a} 补给`),
    R('^contributed (\\d+) Supplies$', (_, a) => `贡献了 ${a} 补给`),
    R('^recorded an? (SUCCESS|MISS|WITHDRAWN|EXPIRED|VOID) mission$', (_, o) => `记录了一次${outcome(o)}的任务`),
    R('^completed a recorded mission$', () => '完成了一次有记录的任务'),
    R('^leased the (.+)$', (_, b) => `租下了${place(b)}`),
    R('^(.+) occupied the (.+)\\.$', (_, c, b) => `${c} 占领了${place(b)}。`),
    R('^Lease (.+)\\?$', (_, b) => `租下${place(b)}？`),
    R('^Lock (\\d+) Supplies\\?$', (_, a) => `锁定 ${a} 补给？`),
    R('^Post a (\\w+) job for a proven Agent\\. This budget is locked now, paid on verified success, or refunded on failure or expiry\\.$', (_, k) => `为一名有战绩的智能体发布${kind(k)}任务。这笔预算现在锁定，核实成功后支付，失败或过期则退款。`),
    R('^A fresh (\\w+) mission starts now\\. You pay its mission costs\\. Earn (\\d+) Supplies only if this exact mission succeeds within 15 minutes\\.$', (_, k, a) => `一个新的${kind(k)}任务现在开始。任务费用由你承担。只有这个任务在 15 分钟内成功，你才能赚到 ${a} 补给。`),
    R('^Earn a (\\w+) success first$', (_, k) => `先完成一次${kind(k)}成功`),
    R('^Posted by (.+)$', (_, w) => `发布者：${w}`),
    R('^You were hired by (.+)$', (_, w) => `${w} 雇佣了你`),
    R('^You hired (.+)$', (_, w) => `你雇佣了 ${w === '— awaiting provider' ? '— 等待承接方' : w}`),
    R('^Escrow limit: (\\d+) Supplies per job\\. Turning permissions off blocks new actions; existing commitments still settle\\.$', (_, a) => `托管上限：每个任务 ${a} 补给。关闭权限会阻止新的操作；已有的承诺仍会结算。`),
    R('^Escrow refunded:(.*)$', (_, r) => `托管已退款：${sub(r.trim())}`),
    R('^Alert (\\d)\\/4 raises resistance\\. Defend, lay low, or resupply\\.$', (_, a) => `警戒 ${a}/4 会提高阻力。去防守、低调行事或补给。`),
    R('^Watch active · alert (\\d)\\/4 · defend to lower pressure$', (_, a) => `警戒中 · 警戒 ${a}/4 · 防守可降低压力`),
    R('^ROUND (\\d) \\/ 3$', (_, a) => `第 ${a} / 3 回合`),
    R('^Round (\\d+): (\\w+) vs (\\w+)$', (_, a, b, c) => `第 ${a} 回合：${sub(b.toUpperCase())} 对 ${sub(c.toUpperCase())}`),
    R('^Review (.+)$', (_, j) => { const z = tr(j); return z ? `查看${z}` : null; }),
    R('^Chapter (\\d+): (.+)$', (_, a, c) => `第 ${a} 章：${sub(c)}`),
    R('^(\\d\\d) \\/ (\\d\\d) · (.+)$', (_, a, b, c) => `${a} / ${b} · ${sub(c)}`),
    R('^(.+?) · ([\\d,]+) ELO$', (_, r, e) => `${r} · ${e} ELO`),
    R('^Visual quality (low|medium|high)\\. Activate to change\\.$', (_, q) => `画质：${{ low: '低', medium: '中', high: '高' }[q]}。点击切换。`),
    R('^Server error:(.*)$', (_, r) => `服务器错误：${r}`),
    R('^Recorded (\\d+)$', (_, a) => `已记录 ${a}`),
    R('^Replay hash (.+)$', (_, h) => `回放哈希 ${h}`),
    R('^Policy hash (.+)$', (_, h) => `权限哈希 ${h}`),
    R('^Receipt (proof_.+)$', (_, h) => `凭证 ${h}`),
  ];
  // Signs followed by a fixed piece of advice.
  PAT.push([{ exec: (s) => { for (const a of ADVICE) if (s.length > a.length && s.endsWith(a)) return [s, s.slice(0, -a.length).trim(), a]; return null; } }, (_, sg, a) => `${signs(sg)} ${ZH[a]}`]);
  // Generic: a phrase behind a leading "· " or before a trailing " ·".
  PAT.push([/^· (.+)$/, (_, s) => { const z = tr(s); return z ? '· ' + z : null; }]);
  PAT.push([/^(.+) ·$/, (_, s) => { const z = tr(s); return z ? z + ' ·' : null; }]);

  function tr(s) {
    if (Object.prototype.hasOwnProperty.call(ZH, s)) return ZH[s];
    const l = LC.get(s.toLowerCase());
    if (l != null) return l;
    for (const [re, f] of PAT) {
      const m = re.exec(s);
      if (m) { const r = f(...m); if (r != null) return r; }
    }
    return null;
  }

  // ── The page ───────────────────────────────────────────────────────────
  const TEXT = new WeakMap(); // text node -> { en, zh }
  const ATTR = new WeakMap(); // element -> { attr: { en, zh } }
  const HTML = new WeakMap(); // element with data-zh -> its English innerHTML
  const ATTRS = ['title', 'aria-label', 'placeholder', 'alt'];
  const SKIP = /^(SCRIPT|STYLE|TEXTAREA|CODE|PRE|NOSCRIPT)$/;
  let busy = false; // our own writes

  function skipped(el) {
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      if (SKIP.test(e.tagName) || e.hasAttribute('data-no-i18n')) return true;
      if (lang === 'zh' && e !== el && e.hasAttribute('data-zh')) return true;
    }
    return false;
  }
  function localise(raw) {
    const core = raw.replace(/\s+/g, ' ').trim();
    if (!core || !/[A-Za-z]/.test(core)) return null;
    const z = tr(core);
    if (z == null) return null;
    const lead = raw.match(/^\s*/)[0], tail = raw.match(/\s*$/)[0];
    return lead + z + tail;
  }
  function doText(node) {
    const v = node.nodeValue, rec = TEXT.get(node);
    if (rec && (v === rec.zh || v === rec.en)) {
      const want = lang === 'zh' ? rec.zh : rec.en;
      if (v !== want) set(() => { node.nodeValue = want; });
      return;
    }
    if (node.parentElement && skipped(node.parentElement)) return;
    const zh = localise(v);
    if (zh == null) { TEXT.set(node, { en: v, zh: v }); return; }
    TEXT.set(node, { en: v, zh });
    if (lang === 'zh') set(() => { node.nodeValue = zh; });
  }
  function doAttr(el, a) {
    const v = el.getAttribute(a);
    if (v == null) return;
    let recs = ATTR.get(el); if (!recs) ATTR.set(el, (recs = {}));
    const rec = recs[a];
    if (rec && (v === rec.zh || v === rec.en)) {
      const want = lang === 'zh' ? rec.zh : rec.en;
      if (v !== want) set(() => el.setAttribute(a, want));
      return;
    }
    if (skipped(el)) return;
    const zh = localise(v);
    recs[a] = { en: v, zh: zh ?? v };
    if (lang === 'zh' && zh != null) set(() => el.setAttribute(a, zh));
  }
  function doElement(el) {
    if (el.hasAttribute('data-zh')) {
      if (lang === 'zh' && !HTML.has(el)) { HTML.set(el, el.innerHTML); set(() => { el.innerHTML = el.getAttribute('data-zh'); }); }
      else if (lang === 'en' && HTML.has(el)) { const h = HTML.get(el); HTML.delete(el); set(() => { el.innerHTML = h; }); }
    }
    if (el.tagName === 'A') {
      const h = el.getAttribute('href') || '';
      if (/player-guide(\.zh)?\.html/.test(h)) {
        const want = h.replace(/player-guide(\.zh)?\.html/, lang === 'zh' ? 'player-guide.zh.html' : 'player-guide.html');
        if (want !== h) set(() => el.setAttribute('href', want));
      }
    }
    for (const a of ATTRS) if (el.hasAttribute(a)) doAttr(el, a);
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1) { if (SKIP.test(root.tagName) || root.hasAttribute('data-no-i18n')) return; doElement(root); }
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: (n) => (n.nodeType === 1 && (SKIP.test(n.tagName) || n.hasAttribute('data-no-i18n')) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    let n;
    while ((n = w.nextNode())) { if (n.nodeType === 3) doText(n); else doElement(n); }
  }
  function set(fn) { busy = true; try { fn(); } finally { busy = false; } }

  let title = null;
  function doTitle() {
    const t = document.title;
    if (title && (t === title.zh || t === title.en)) { const want = lang === 'zh' ? title.zh : title.en; if (t !== want) document.title = want; return; }
    const zh = localise(t) ?? t; title = { en: t, zh };
    if (lang === 'zh' && zh !== t) document.title = zh;
  }

  const observer = new MutationObserver((list) => {
    if (busy) return;
    for (const m of list) {
      if (m.type === 'characterData') doText(m.target);
      else if (m.type === 'attributes') { if (ATTRS.includes(m.attributeName)) doAttr(m.target, m.attributeName); }
      else {
        if (m.target.nodeName === 'TITLE') { doTitle(); continue; }
        m.addedNodes.forEach(walk);
      }
    }
  });
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });

  // ── Switching ──────────────────────────────────────────────────────────
  const listeners = [];
  function paintButton() {
    const b = document.getElementById('lang-btn');
    if (!b) return;
    set(() => {
      b.textContent = lang === 'zh' ? 'EN' : '中文';
      b.setAttribute('aria-label', lang === 'zh' ? 'Switch to English' : '切换到中文');
      b.title = lang === 'zh' ? 'English' : '中文';
    });
  }
  function apply() {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.documentElement.classList.toggle('lang-zh', lang === 'zh');
    if (document.body) walk(document.body);
    doTitle();
    paintButton();
  }
  function setLang(l) {
    if (l !== 'zh' && l !== 'en') return;
    if (l === lang) return;
    lang = l;
    try { localStorage.setItem(KEY, l); } catch {}
    apply();
    listeners.forEach((f) => { try { f(l); } catch {} });
  }
  addEventListener('storage', (e) => { if (e.key === KEY && (e.newValue === 'zh' || e.newValue === 'en')) setLang(e.newValue); });

  function ready() {
    apply();
    const b = document.getElementById('lang-btn');
    if (b && !b.dataset.bound) { b.dataset.bound = '1'; b.addEventListener('click', () => setLang(lang === 'zh' ? 'en' : 'zh')); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();

  window.kultI18n = {
    get lang() { return lang; },
    setLang,
    onLang: (f) => listeners.push(f),
    t: (s) => (lang === 'zh' ? tr(s) ?? s : s),
  };
})();
