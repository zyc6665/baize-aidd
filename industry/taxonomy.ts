// 这个行业的分类体系：类别、标签词表、公司（主体）名录，以及防止张冠李戴的身份词典。
// 模型按这里的词表打标签，主题页（topics.json）按标签归类，筛选栏按类别分组。
// 换行业时：类别的 key 会出现在网址里（/all?category=…），上线后就不要再改；标签和名录可以随时增减。

/**
 * 网页上的类别（筛选栏、卡片角标、RSS 分类订阅）。key 是网址和接口里的身份，上线后不要改。
 * section 是日报里的分节标题（几个类别可以共用一节，按这里的顺序排）；guide 告诉结构抽取模型这一类收什么、
 * 和相邻类别的边界在哪（总的归类原则写在 prompts/structure.md 里）。
 * commentary 标出评论类（观点、解读）：日报写过的事又有评论类的后续报道，只占一行快讯（报道它的信源够多时除外）。
 * 没归上类的资料在日报里放进第一个 key 为 industry 的类别所在的节（没有就放最后一节）。
 * tagColor 是飞书推送卡片里跟在标题后面的一类小标签的颜色（飞书 text_tag 的颜色名）。
 * feedLabel 是分类 RSS 标题里的名字（不写就用 label）。公开接口、RSS 和 MCP 里要把一类并进另一类发布，写在站点设置里（site/site.ts 的 PUBLIC_CATEGORIES）。
 */
export const CATEGORIES = [
  {
    key: "models",
    tagColor: "indigo",
    label: "模型与方法",
    feedLabel: "模型与方法",
    section: "模型与方法",
    guide:
      "新的模型、算法、架构、训练方法、分子表征或生成方法本身，以及预印本和期刊论文里能被复用的技术进展、新数据集、新基准。论文默认归这一类，不单设论文类；只有在讲清楚它对药物研发流程的影响时才例外。发布一次跑分不是新方法，教程也不是模型。",
  },
  {
    key: "tools",
    tagColor: "turquoise",
    label: "工具与平台",
    feedLabel: "工具与平台",
    section: "工具与平台",
    guide:
      "能被使用的软件、平台、SaaS、开源库、API、模型服务、算力与云服务、实验室自动化与机器人系统、湿实验闭环产品。开源即发布也算，但要能确认是新的或有大版本变化；单纯讲怎么用某个工具属教程，不属这一类。",
  },
  {
    key: "clinical",
    tagColor: "red",
    label: "临床与管线",
    feedLabel: "临床与管线",
    section: "临床与管线",
    guide:
      "药物和疗法的临床进展：IND 受理与获批、入组、剂量爬坡、临床读出（含失败、终止、暂停）、安全性信号、上市申请与审批结果、管线增减与优先级调整、适应症拓展。结果好坏不影响归类，也不影响分数；AI 在其中起了不可替代的作用时照常入这一类。纯粹的公司经营（裁员、财报）属产业与生态。",
  },
  {
    key: "deals",
    tagColor: "orange",
    label: "交易与资本",
    feedLabel: "交易与资本",
    section: "交易与资本",
    guide:
      "钱和权利的转移：BD 授权与许可（首付、里程碑、销售分成）、合作研发、融资（各轮次、IPO、定增、可转债）、并购与资产转让、MNC 与 AI 公司的合作、平台订阅或算力采购协议、专利许可与诉讼和解。已经签署或披露的交易才归这一类，传闻和意向书要写明是传闻。",
  },
  {
    key: "policy",
    tagColor: "violet",
    label: "政策与监管",
    feedLabel: "政策与监管",
    section: "政策与监管",
    guide:
      "规则本身：FDA、EMA、NMPA、CDE 的指南与征求意见稿、法规修订、审评审批路径变化、医保支付与定价、出口管制与实体清单、数据与隐私合规、AI 医疗器械与算法监管、伦理与生物安全规定。只公布文件、没有实际动作和后果的，按政策收录但要写清是文件；对政策的评论属观点，不属这一类。",
  },
  {
    key: "industry",
    tagColor: "gold",
    label: "产业与生态",
    feedLabel: "产业与生态",
    section: "产业与生态",
    guide:
      "行业怎么运转：产能与工厂、裁员与组织调整、财报与业绩指引、市场数据与规模预测、区域集群与园区、CRO/CDMO 与供应链、会议与竞赛、人才流动、行业榜单与排名、公司战略调整。新闻由当事人发帖、带有态度，也不因此变成观点。",
  },
  {
    key: "opinion",
    tagColor: "purple",
    label: "观点与分析",
    feedLabel: "观点与分析",
    section: "观点与分析",
    guide:
      "重点是作者的解释、判断、主张、预测、评论、访谈或对行业报告的解读。讨论临床失败或交易不自动归观点，作者是名人不自动归观点；没有新的可复用事实（方法、数据、流程）时归这一类，而不是模型与方法。",
    commentary: true,
  },
] as const satisfies ReadonlyArray<{ key: string; tagColor: string; label: string; feedLabel?: string; section: string; guide: string; commentary?: true }>;

/**
 * 这个行业最受关注的一类发布（AIDD 是新模型与方法）：日报报头的“N 个新模型”、改分类后修订已出的报告都按它数。
 * category 是类别，tag 是标签，两者都对上才算；unit 接在数字后面。
 * 没有这样一类的行业设成 null，报头就不显示这个数。
 */
export const RELEASE: { category: string; tag: string; unit: string } | null = { category: "models", tag: "模型发布", unit: "项新方法" };

/** 周报月报的总述可以直接写、不必在报道里找到出处的行业通用词（小写）。站名会自动算进去。 */
export const PLAIN_TERMS: readonly string[] = [
  "ai", "aidd", "ml", "llm", "gpu", "api", "cro", "cxo", "cdmo", "bd", "ipo", "ind", "nda", "bla", "fda", "ema", "nmpa", "cde", "adc", "mrna", "sirna", "protac", "glp-1", "pd-1", "her2",
];

/**
 * 内容理解一步给每篇资料判的“内容类型”（写在 prompts/content-understanding.md 里，改了类型要同步改那份提示词）。
 * 评分提示词（prompts/selection-score.md）按类型给五个维度不同的权重。
 */
export const ITEM_TYPES = ["model_release", "product_launch", "tool_or_prompt", "research_paper", "industry_event", "opinion_analysis", "tutorial_explainer"] as const;

// ── 标签词表 ────────────────────────────────────────────────────────────────────────────

/** 每篇资料的第一个标签必须是这些“分类标签”之一。 */
export const CATEGORY_TAGS = [
  "模型发布", "方法/算法", "论文/研究", "数据集/基准", "工具/平台", "开源/代码", "临床进展", "审批/监管",
  "交易/融资", "产业动态", "观点/评论", "教程/解读", "非AIDD/无关", "其他",
] as const;

/** 可选的主题标签。 */
export const TOPIC_TAGS = [
  "药物发现", "靶点发现", "分子生成", "分子表征", "ADMET", "虚拟筛选", "蛋白结构", "抗体设计", "多肽/小分子",
  "核酸/基因治疗", "细胞治疗", "化学合成", "临床试验设计", "真实世界数据", "生物标志物", "多组学", "知识图谱",
  "基础模型", "智能体", "实验室自动化", "湿实验闭环", "算力/基础设施", "数据/数据集",
] as const;

/** 可选的实体标签（公司、机构、平台）。 */
export const ENTITY_TAGS = [
  "Isomorphic Labs", "Google DeepMind", "Recursion", "Insilico Medicine", "Schrödinger", "Chai Discovery",
  "EvolutionaryScale", "Generate", "NVIDIA", "XtalPi", "BioMap",
] as const;

/** 模型常写的近义词，统一成词表里的写法。 */
export const TAG_SYNONYMS: Readonly<Record<string, string>> = {
  "教程/玩法": "教程/解读", "技巧/最佳实践": "教程/解读", "教程/实践": "教程/解读", 教程: "教程/解读", 解读: "教程/解读", 指南: "教程/解读",
  合作: "交易/融资", 生态: "产业动态", 融资: "交易/融资", 收购: "交易/融资", 投资: "交易/融资", 并购: "交易/融资", 授权: "交易/融资",
  "BD/授权": "交易/融资", 交易: "交易/融资", 许可: "交易/融资", "IPO/上市": "交易/融资",
  政策: "审批/监管", 监管: "审批/监管", 法规: "审批/监管", 审批: "审批/监管", "合规": "审批/监管", "FDA": "审批/监管", "NMPA": "审批/监管",
  论文: "论文/研究", 研究: "论文/研究", paper: "论文/研究", papers: "论文/研究", preprint: "论文/研究", 预印本: "论文/研究",
  算法: "方法/算法", 方法: "方法/算法", 模型: "模型发布", 架构: "方法/算法",
  数据集: "数据集/基准", 基准: "数据集/基准", benchmark: "数据集/基准", 评测: "数据集/基准",
  "open-source": "开源/代码", 开源: "开源/代码", 代码: "开源/代码", repo: "开源/代码", 仓库: "开源/代码",
  产品: "工具/平台", 工具: "工具/平台", 平台: "工具/平台", 软件: "工具/平台", SaaS: "工具/平台",
  临床: "临床进展", 管线: "临床进展", 试验: "临床进展", "读出": "临床进展", 适应症: "临床进展",
  观点: "观点/评论", 评论: "观点/评论", 访谈: "观点/评论", 时评: "观点/评论",
  行业: "产业动态", 动态: "产业动态", 产业: "产业动态", 财报: "产业动态", 产能: "产业动态",
  非ai: "非AIDD/无关", "non-ai": "非AIDD/无关", 无关: "非AIDD/无关", 通用工具: "非AIDD/无关",
};

// ── 公司与主体 ──────────────────────────────────────────────────────────────────────────

/**
 * 公司主题：id → 显示名、卡片上显示的标签（null 表示只用 entity:<id> 归类）、别名。
 * aliases 给结构抽取模型看；orgNames 是这家公司发消息时开头用的组织名（公司、实验室、团队），
 * 在它自己的主题页上读者知道说的是谁，可以省去；otherNames 是公司的其他称呼（官方账号名、子品牌）。
 * 所有这些名字都用来认出说的是哪家公司，比如把事实的主体对到发布方。
 */
export const ENTITIES: Record<string, { name: string; displayTag: string | null; aliases: string[]; orgNames?: string[]; otherNames?: string[] }> = {
  // ── AI 制药与 AI for Science
  "isomorphic-labs": {
    name: "Isomorphic Labs",
    displayTag: "Isomorphic Labs",
    aliases: ["Isomorphic Labs", "Isomorphic"],
    orgNames: ["Isomorphic Labs"],
  },
  google: {
    name: "Google DeepMind",
    displayTag: "Google DeepMind",
    aliases: ["Google DeepMind", "DeepMind", "AlphaFold", "AlphaProteo", "AMIE", "IsoDDE"],
    orgNames: ["Google DeepMind", "Google Research", "DeepMind", "Google"],
    otherNames: ["AlphaFold Team", "Google AI"],
  },
  recursion: { name: "Recursion", displayTag: "Recursion", aliases: ["Recursion", "Recursion Pharmaceuticals"], orgNames: ["Recursion"], otherNames: ["Recursion Pharma"] },
  insilico: {
    name: "英矽智能 Insilico Medicine",
    displayTag: "Insilico Medicine",
    aliases: ["Insilico Medicine", "Insilico", "英矽智能", "英矽"],
    orgNames: ["Insilico Medicine", "英矽智能", "Insilico"],
  },
  schrodinger: { name: "Schrödinger", displayTag: "Schrödinger", aliases: ["Schrödinger", "Schrodinger", "薛定谔"], orgNames: ["Schrödinger", "Schrodinger"] },
  "chai-discovery": { name: "Chai Discovery", displayTag: "Chai Discovery", aliases: ["Chai Discovery", "Chai-1", "Chai-2"], orgNames: ["Chai Discovery"] },
  evolutionaryscale: { name: "EvolutionaryScale", displayTag: "EvolutionaryScale", aliases: ["EvolutionaryScale", "ESM3", "ESM"], orgNames: ["EvolutionaryScale"] },
  generate: { name: "Generate Biomedicines", displayTag: "Generate", aliases: ["Generate Biomedicines", "Generate:Biomedicines", "Chroma"], orgNames: ["Generate Biomedicines", "Generate"] },
  iambic: { name: "Iambic Therapeutics", displayTag: null, aliases: ["Iambic Therapeutics", "Iambic"], orgNames: ["Iambic Therapeutics"] },
  "latent-labs": { name: "Latent Labs", displayTag: null, aliases: ["Latent Labs"], orgNames: ["Latent Labs"] },
  "nabla-bio": { name: "Nabla Bio", displayTag: null, aliases: ["Nabla Bio", "Nabla"], orgNames: ["Nabla Bio"] },
  atomwise: { name: "Atomwise", displayTag: null, aliases: ["Atomwise"], orgNames: ["Atomwise"] },
  benevolent: { name: "BenevolentAI", displayTag: null, aliases: ["BenevolentAI", "Benevolent AI"], orgNames: ["BenevolentAI"] },
  owkin: { name: "Owkin", displayTag: null, aliases: ["Owkin"], orgNames: ["Owkin"] },
  abcellera: { name: "AbCellera", displayTag: null, aliases: ["AbCellera"], orgNames: ["AbCellera"] },
  tempus: { name: "Tempus", displayTag: null, aliases: ["Tempus", "Tempus AI"], orgNames: ["Tempus"] },
  xtalpi: { name: "晶泰科技 XtalPi", displayTag: "XtalPi", aliases: ["XtalPi", "晶泰科技", "晶泰"], orgNames: ["XtalPi", "晶泰科技", "晶泰"] },
  dptech: { name: "深势科技 DP Technology", displayTag: null, aliases: ["DP Technology", "深势科技", "深势", "Uni-Mol", "Uni-RNA"], orgNames: ["深势科技", "DP Technology"] },
  biomap: { name: "百图生科 BioMap", displayTag: null, aliases: ["BioMap", "百图生科", "百图"], orgNames: ["百图生科", "BioMap"] },
  metis: { name: "剂泰医药 METiS", displayTag: null, aliases: ["METiS", "剂泰医药", "剂泰"], orgNames: ["剂泰医药", "METiS"] },
  "boltz": { name: "Boltz", displayTag: null, aliases: ["Boltz", "Boltz-1", "Boltz-2"], orgNames: ["Boltz"] },

  // ── 平台与基础设施
  nvidia: { name: "NVIDIA", displayTag: "NVIDIA", aliases: ["NVIDIA", "英伟达", "BioNeMo", "cuEquivariance"], orgNames: ["NVIDIA", "英伟达"] },
  microsoft: { name: "Microsoft", displayTag: null, aliases: ["Microsoft", "微软", "BioEmu", "Azure"], orgNames: ["Microsoft Research", "Microsoft", "微软"] },
  aws: { name: "AWS", displayTag: null, aliases: ["AWS", "Amazon Web Services", "亚马逊云"], orgNames: ["AWS", "Amazon Web Services"] },
  meta: { name: "Meta", displayTag: null, aliases: ["Meta", "ESMFold", "ESM-2"], orgNames: ["Meta AI", "Meta"] },
  huggingface: { name: "Hugging Face", displayTag: null, aliases: ["Hugging Face", "HuggingFace"], orgNames: ["Hugging Face", "HuggingFace"] },

  // ── 大药企与生物技术
  lilly: { name: "礼来 Eli Lilly", displayTag: null, aliases: ["Eli Lilly", "Lilly", "礼来"], orgNames: ["Eli Lilly", "Lilly", "礼来"] },
  novartis: { name: "诺华 Novartis", displayTag: null, aliases: ["Novartis", "诺华"], orgNames: ["Novartis", "诺华"] },
  astrazeneca: { name: "阿斯利康 AstraZeneca", displayTag: null, aliases: ["AstraZeneca", "阿斯利康"], orgNames: ["AstraZeneca", "阿斯利康"] },
  pfizer: { name: "辉瑞 Pfizer", displayTag: null, aliases: ["Pfizer", "辉瑞"], orgNames: ["Pfizer", "辉瑞"] },
  sanofi: { name: "赛诺菲 Sanofi", displayTag: null, aliases: ["Sanofi", "赛诺菲"], orgNames: ["Sanofi", "赛诺菲"] },
  gsk: { name: "GSK", displayTag: null, aliases: ["GSK", "GlaxoSmithKline", "葛兰素史克"], orgNames: ["GSK", "葛兰素史克"] },
  merck: { name: "默沙东 Merck", displayTag: null, aliases: ["Merck", "MSD", "默沙东", "默克"], orgNames: ["Merck", "MSD", "默沙东"] },
  jnj: { name: "强生 J&J", displayTag: null, aliases: ["Johnson & Johnson", "J&J", "强生"], orgNames: ["Johnson & Johnson", "J&J", "强生"] },
  roche: { name: "罗氏 Roche", displayTag: null, aliases: ["Roche", "Genentech", "罗氏"], orgNames: ["Roche", "Genentech", "罗氏"] },
  bms: { name: "百时美施贵宝 BMS", displayTag: null, aliases: ["Bristol Myers Squibb", "BMS", "百时美施贵宝"], orgNames: ["Bristol Myers Squibb", "BMS"] },
  abbvie: { name: "艾伯维 AbbVie", displayTag: null, aliases: ["AbbVie", "艾伯维"], orgNames: ["AbbVie", "艾伯维"] },
  amgen: { name: "安进 Amgen", displayTag: null, aliases: ["Amgen", "安进"], orgNames: ["Amgen", "安进"] },
  "novo-nordisk": { name: "诺和诺德 Novo Nordisk", displayTag: null, aliases: ["Novo Nordisk", "诺和诺德"], orgNames: ["Novo Nordisk", "诺和诺德"] },
  wuxi: { name: "药明康德 WuXi", displayTag: null, aliases: ["WuXi", "WuXi AppTec", "药明康德", "药明"], orgNames: ["WuXi AppTec", "药明康德", "药明"] },
  hengrui: { name: "恒瑞医药", displayTag: null, aliases: ["恒瑞医药", "恒瑞", "Hengrui"], orgNames: ["恒瑞医药", "恒瑞"] },
  beigene: { name: "百济神州 BeiGene", displayTag: null, aliases: ["BeiGene", "百济神州", "百济"], orgNames: ["BeiGene", "百济神州"] },
  innovent: { name: "信达生物 Innovent", displayTag: null, aliases: ["Innovent", "信达生物", "信达"], orgNames: ["Innovent", "信达生物"] },
  aka: { name: "康方生物 Akeso", displayTag: null, aliases: ["Akeso", "康方生物", "康方"], orgNames: ["Akeso", "康方生物"] },
};

/**
 * 身份词典：摘要和标题里出现的公司，必须在原文里也出现过，否则退回原标题、丢掉摘要（防止模型张冠李戴）。
 * 行业没有这个问题时可以留空数组。
 */
export const IDENTITY_LEXICON: ReadonlyArray<{ id: string; name: string; patterns: RegExp[] }> = [
  { id: "isomorphic-labs", name: "Isomorphic Labs", patterns: [/isomorphic\s*labs?/i] },
  { id: "google", name: "Google DeepMind", patterns: [/google|deepmind|alphafold|alphaproteo|\bamie\b|isodde|谷歌/i] },
  { id: "recursion", name: "Recursion", patterns: [/recursion/i] },
  { id: "insilico", name: "英矽智能", patterns: [/insilico|英矽/i] },
  { id: "schrodinger", name: "Schrödinger", patterns: [/schr[öo]dinger/i] },
  { id: "chai-discovery", name: "Chai Discovery", patterns: [/\bchai(?:-?\d)?\b/i] },
  { id: "evolutionaryscale", name: "EvolutionaryScale", patterns: [/evolutionaryscale|\besm\s?-?\d/i] },
  { id: "generate", name: "Generate Biomedicines", patterns: [/generate\s?biomedicines|generate:biomedicines|\bchroma\b/i] },
  { id: "xtalpi", name: "晶泰科技", patterns: [/xtalpi|晶泰/i] },
  { id: "dptech", name: "深势科技", patterns: [/dp\s?technology|深势|uni-?(?:mol|rna)/i] },
  { id: "biomap", name: "百图生科", patterns: [/biomap|百图/i] },
  { id: "metis", name: "剂泰医药", patterns: [/metis|剂泰/i] },
  { id: "nvidia", name: "NVIDIA", patterns: [/nvidia|英伟达|bionemo/i] },
  { id: "microsoft", name: "Microsoft", patterns: [/microsoft|微软|bioemu/i] },
  { id: "meta", name: "Meta", patterns: [/\bmeta\b|esmfold|\besm-?2\b/i] },
  { id: "lilly", name: "礼来", patterns: [/eli\s?lilly|\blilly\b|礼来/i] },
  { id: "novartis", name: "诺华", patterns: [/novartis|诺华/i] },
  { id: "astrazeneca", name: "阿斯利康", patterns: [/astrazeneca|阿斯利康/i] },
  { id: "pfizer", name: "辉瑞", patterns: [/pfizer|辉瑞/i] },
  { id: "sanofi", name: "赛诺菲", patterns: [/sanofi|赛诺菲/i] },
  { id: "gsk", name: "GSK", patterns: [/\bgsk\b|glaxo|葛兰素史克/i] },
  { id: "merck", name: "默沙东", patterns: [/\bmerck\b|\bmsd\b|默沙东/i] },
  { id: "jnj", name: "强生", patterns: [/johnson\s*&\s*johnson|\bj&j\b|强生/i] },
  { id: "roche", name: "罗氏", patterns: [/roche|genentech|罗氏/i] },
  { id: "bms", name: "BMS", patterns: [/bristol\s*myers|百时美/i] },
  { id: "abbvie", name: "艾伯维", patterns: [/abbvie|艾伯维/i] },
  { id: "amgen", name: "安进", patterns: [/\bamgen\b|安进/i] },
  { id: "novo-nordisk", name: "诺和诺德", patterns: [/novo\s?nordisk|诺和诺德/i] },
  { id: "wuxi", name: "药明康德", patterns: [/wuxi|药明/i] },
  { id: "hengrui", name: "恒瑞医药", patterns: [/hengrui|恒瑞/i] },
  { id: "beigene", name: "百济神州", patterns: [/beigene|百济/i] },
  { id: "innovent", name: "信达生物", patterns: [/innovent|信达/i] },
  { id: "aka", name: "康方生物", patterns: [/akeso|康方/i] },
];

/** 这些域名上的文章，发布方就是对应的公司（托管平台如 bioRxiv、arXiv 不算）。 */
export const PUBLISHER_DOMAINS: ReadonlyArray<{ entityId: string; domains: readonly string[] }> = [
  { entityId: "isomorphic-labs", domains: ["isomorphiclabs.com"] },
  { entityId: "google", domains: ["deepmind.google", "blog.google", "research.google"] },
  { entityId: "recursion", domains: ["recursion.com"] },
  { entityId: "insilico", domains: ["insilico.com"] },
  { entityId: "schrodinger", domains: ["schrodinger.com"] },
  { entityId: "chai-discovery", domains: ["chaidiscovery.com"] },
  { entityId: "evolutionaryscale", domains: ["evolutionaryscale.ai"] },
  { entityId: "generate", domains: ["generatebiomedicines.com"] },
  { entityId: "iambic", domains: ["iambic.ai"] },
  { entityId: "latent-labs", domains: ["latentlabs.com"] },
  { entityId: "nabla-bio", domains: ["nabla.bio"] },
  { entityId: "atomwise", domains: ["atomwise.com"] },
  { entityId: "benevolent", domains: ["benevolent.com"] },
  { entityId: "owkin", domains: ["owkin.com"] },
  { entityId: "abcellera", domains: ["abcellera.com"] },
  { entityId: "tempus", domains: ["tempus.com"] },
  { entityId: "xtalpi", domains: ["xtalpi.com"] },
  { entityId: "dptech", domains: ["dptech.com"] },
  { entityId: "biomap", domains: ["biomap.com"] },
  { entityId: "nvidia", domains: ["nvidia.com"] },
  { entityId: "microsoft", domains: ["microsoft.com"] },
];

/** 原文里的这些写法也算提到了对应公司。 */
export const IDENTITY_CONTEXT_ALIASES: ReadonlyArray<{ entityId: string; pattern: RegExp }> = [
  { entityId: "isomorphic-labs", pattern: /@isomorphiclabs\b/i },
  { entityId: "recursion", pattern: /@recursionpharma\b/i },
  { entityId: "insilico", pattern: /@insilicomedicine\b/i },
];
