
【AIDD 领域翻译规则 — 本平台是 AI 药物研发与生物医药行业站，严格遵守】

1. 歧义默认值：以下词在中文有非本行业的歧义，**一律按本行业含义翻译**：
   - target = 靶点（不是"目标"/"靶子"）；target discovery = 靶点发现
   - hit = 命中化合物 / 苗头化合物（不是"点击"/"热门"）；hit rate = 命中率
   - lead = 先导化合物（不是"领导"/"线索"）；lead optimization = 先导化合物优化
   - candidate = 候选分子 / 候选药物（不是"候选人"）
   - screening = 筛选（virtual screening = 虚拟筛选）；screen = 筛选
   - assay = 实验 / 检测（in vitro assay = 体外实验，不译"化验"）
   - docking = 分子对接；pose = 结合构象（不是"姿势"）
   - ensemble：conformational ensemble = 构象系综；model ensemble = 模型集成。按上下文区分
   - affinity = 亲和力；potency = 活性 / 效价；selectivity = 选择性；off-target = 脱靶
   - modality = 药物形式 / 模态（不译"模式"）
   - scaffold = 骨架（化学骨架）；warhead = 弹头（共价弹头）；linker = 连接子；payload = 载荷
   - readout = 读出（临床读出，不译"读数"）；endpoint = 终点；enrollment = 入组
   - regimen = 给药方案；dose = 剂量；clearance = 清除率；half-life = 半衰期
   - polymorph = 晶型；co-crystal = 共晶；enantiomer = 对映体；yield = 收率；scale-up = 放大
   - in silico = 计算 / 计算机模拟（可保留 in silico）；in vitro = 体外；in vivo = 体内
   - wet lab = 湿实验；dry lab = 计算部分
   - benchmark = 基准；ablation = 消融实验；baseline = 基线；generalization = 泛化；out-of-distribution = 分布外
   - equivariance = 等变性；flow matching = 流匹配；diffusion = 扩散模型；transformer = Transformer 架构（保留英文，不译"变压器"）
   - token = 模型 token（保留英文，绝不译"代币"/"令牌"）；embedding = 嵌入向量（可保留英文）
   - pretrain = 预训练；fine-tune = 微调；distillation = 蒸馏；hallucination = 模型幻觉
   - agent / agentic = 智能体 / 智能体的（不译"代理人"）
   - milestone = 里程碑付款；upfront = 首付款；royalty = 销售分成；term sheet = 条款清单
   - IND = 新药临床申请（保留英文）；NDA / BLA = 上市申请（保留英文）；orphan drug = 孤儿药
   - fast track = 快速通道；breakthrough therapy = 突破性疗法认定；priority review = 优先审评

2. 以下专有名词**一律保留英文原文**，不翻译不加中文括注：
   - 公司与机构：Isomorphic Labs / Google DeepMind / Recursion / Insilico Medicine / Schrödinger / Chai Discovery / EvolutionaryScale / Generate Biomedicines / Iambic / Latent Labs / Nabla Bio / Atomwise / BenevolentAI / Owkin / AbCellera / Tempus / NVIDIA / Microsoft Research / Broad Institute
   - 模型与平台（举例 + 通用规则）：AlphaFold / AlphaFold 3 / AlphaProteo / AMIE / ESM3 / ESMFold / Chai-1 / Chai-2 / Boltz-1 / Boltz-2 / Chroma / Uni-Mol / Uni-RNA / BioNeMo / Boltz / RoseTTAFold / RFdiffusion / ProteinMPNN
     **规则**：任何模型族名、产品代号、版本号一律保留英文，一字不改（不要把 "Boltz-2" 译成 "第二版"，不要把 "ESM3" 译成 "第三代 ESM"）
   - 靶点与基因符号：EGFR / KRAS G12C / HER2 / PD-1 / PD-L1 / CTLA-4 / TROP2 / CD19 / BCMA / BTK / JAK / PARP / PCSK9 / IL-23 / TNF-α / GLP-1 / GIP / AMPA / CLDN18.2 / TIGIT / LAG-3
     **规则**：靶点名、基因名、蛋白名保留大写英文与希腊字母后缀，不译成中文俗称
   - 技术缩写（举例 + 通用规则）：ADMET / DMPK / QSAR / SBDD / FBDD / DEL / PROTAC / ADC / mRNA / siRNA / ASO / CAR-T / TCR-T / CRISPR / AAV / CMC / GMP / CDMO / CRO / IND / NDA / BLA / ORR / PFS / OS / DOR / AE / SAE / PK / PD
     **规则**：任何 2–6 个字母的全大写缩写，默认按本行业含义保留英文
   - 试验与登记号（举例 + 通用规则）：NCT04819373 / KEYNOTE-671 / CheckMate-227 / IMpower150 / ChiCTR2200061234
     **规则**：试验编号一字不改
   - 期刊：Nature / Nature Biotechnology / Nature Medicine / Nature Reviews Drug Discovery / Science / Cell / NEJM / The Lancet / JAMA / bioRxiv / medRxiv / arXiv
   - 通用技术：API / SDK / CLI / SaaS / GPU / TPU / HPC / SE(3) / GNN / LLM / RAG / LoRA

3. 中国厂商**优先用官方中文品牌名**（首次出现可双标，后续选一种保持一致）：
   - 晶泰科技（XtalPi）/ 英矽智能（Insilico Medicine）/ 深势科技（DP Technology）/ 百图生科（BioMap）/ 剂泰医药（METiS）/ 望石智慧 / 星药科技 / 药明康德（WuXi AppTec）/ 恒瑞医药 / 百济神州（BeiGene）/ 信达生物（Innovent）/ 康方生物（Akeso）
   - 不要把公司名意译；不要给国外公司编中文名（Isomorphic Labs 不要写成"同构实验室"）

4. 代码 / 命令 / URL / 数字单位 **一字不改**保留：
   - 反引号代码 `code` 不翻译；命令如 pip install、git clone 不译
   - URL 原样
   - 数字+单位：12 mg/kg Q3W / ORR 43% / mPFS 6.2 个月 / HR 0.71 / p=0.004 / 3.5x speedup / 175B params / 99.9%
   - 金额：$1.2B upfront / $800M in milestones / 保留原文的阿拉伯数字、币种与单位；不要把 $1.2B 改写成“１２亿美元”之外的中文数量词，也不要把 $10B–$100B 改写成“数百亿至数千亿美元”
   - 化学式、SMILES、PDB ID、UniProt ID、CAS 号一律原样
