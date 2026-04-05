# 4DReconFeedforward

# 4D 重建论文汇总对比

> 共 14 篇 · 列：公开时间 / 核心 Idea / 输入 / 输出 / 场景表征方法 / 监督信号

---

## Feed-forward · 点图 / 场景流类

| 方法 | 公开时间 | 核心 Idea | 输入 | 输出 | 场景表征方法 | 监督信号 |
|---|---|---|---|---|---|---|
| **Flow3r** (CVPR 2026) | 2026.02 | **分解式光流作为弱监督**：用一帧的几何 latent + 另一帧的位姿 latent 预测帧间 flow，使 flow 自然解耦几何与运动，以廉价 2D 对应关系替代昂贵 3D 标注，支持 ~800K 无标签视频大规模训练 | 单目/多视角无标签视频 | 相机位姿 + 逐帧稠密点图 | 逐像素点图（per-pixel 3D point） | 伪 GT 光流（off-the-shelf 模型生成） |
| **Flow4R** (arXiv 2026.02) | 2026.02 | **以 Scene Flow 为唯一核心表征统一重建与跟踪**：ViT 单次前向输出 per-pixel {3D 点位置, 场景流, 位姿权重, 置信度}，无需独立位姿回归头或 bundle adjustment | 两帧图像对 | per-pixel 3D 位置 + 场景流向量 + 位姿权重 + 置信度 | 逐像素点图 + 场景流向量场 | 静/动混合数据集上的点图 GT + 场景流 GT |
| **Any4D** (arXiv 2025.12) | 2025.12 | **Egocentric / Allocentric 因子模块化分解**：深度/内参（本地坐标）vs. 外参/场景流（全局坐标），天然支持 RGB / RGB-D / IMU / Radar 多模态输入，N 帧一次性前向推理 | N 帧视频（可选 RGB-D / IMU / Radar） | per-pixel 深度 + 场景流 + 相机内外参（metric scale） | 逐像素深度图 + 场景流（点图序列） | GT 深度 + GT 场景流（合成+真实混合数据集） |
| **4RC** (arXiv 2026.02) | 2026.02 | **Encode-once, query-anywhere-and-anytime**：Transformer 将整段视频编码为紧凑时空 latent，条件解码器可对任意 query 帧、任意目标时刻解码 3D 几何 + 运动；基础几何 + 时间相对运动分解 | 单目视频（多帧） | 任意时刻的稠密 3D 点图 + 长程运动轨迹 | 时空 latent + 条件查询解码（点图序列） | GT 点图 + GT 运动 + 几何一致性正则 |
| **V-DPM** (arXiv 2026.01) | 2026.01 | **将 Dynamic Point Maps（DPM）扩展到视频**：以 VGGT 为 backbone，仅用少量合成数据 fine-tune 静态模型使其理解动态内容，DPM 从图像对推广到完整视频序列，无需后处理优化 | 视频（多帧） | 逐帧动态点图 + 全场景 3D 运动向量 | 动态点图（Dynamic Point Maps，VGGT 架构） | 合成数据上的点图 GT + 运动 GT |
| **PAGE-4D** (arXiv 2025.10) | 2025.10 | **解耦位姿估计与几何重建的任务冲突**：VGGT 在动态场景下二者矛盾（位姿需压制动态，几何需建模动态）。Dynamics-aware aggregator 预测动态 mask：位姿分支中抑制动态 cue，几何分支中放大，少量动态数据 fine-tune VGGT 即可泛化 | 多帧视频（含运动人体/可变形物体） | 相机位姿 + 逐帧深度图 + 稠密点图 + 点跟踪（无后处理） | 稠密点图（继承 VGGT）+ dynamics-aware mask 解耦 | GT 深度 + GT 位姿 + GT 点图（有限动态数据 fine-tune） |
| **D4RT** (arXiv 2025.12, Google DeepMind) | 2025.12 | **统一查询接口**：编码器建立全局视频表示，轻量解码器通过"query 任意像素在任意时刻的 3D 位置"统一回答所有 4D 任务（深度/点云/位姿/跟踪），queries 相互独立可并行，轻量极速 | 单目视频 | 深度图 + 点云 + 相机位姿 + 3D 运动轨迹（统一接口） | 隐式视频 latent + query-based 点级解码 | GT 深度 + GT 对应关系 + GT 位姿（多任务联合训练） |

---

## Feed-forward · Gaussian Splatting 类

| 方法 | 公开时间 | 核心 Idea | 输入 | 输出 | 场景表征方法 | 监督信号 |
|---|---|---|---|---|---|---|
| **EVolSplat4D** (arXiv 2026.01) | 2026.01 | **混合体素 + 像素 3DGS 三分支**：近景静态用体积 3DGS（多视一致），动态目标用 canonical space GS（运动补偿聚合），远场用 per-pixel GS（覆盖全场景），突破 per-pixel 一致性问题 | 多帧多相机 RGB + 3D bounding box 先验 | 4D 动静分离 3D Gaussian 场景 + 实时 NVS | 3D Gaussian Splatting（体素静态分支 + canonical 动态分支 + 像素远场分支） | RGB 光度 loss + 深度监督 + 语义增强 IBR loss |
| **4DGT** (arXiv 2025.06, Meta RL) | 2025.06 | **4D Gaussian 作为 inductive bias 的 Transformer**：仅用真实单目有位姿视频训练（不依赖合成数据），用专家模型深度/法向量作辅助监督，长寿命正则抑制过拟合，动态属性（分割/流）自然涌现 | 64 帧有位姿单目视频（rolling-window） | 4D Gaussian 场景 + 实时 NVS + 光流（涌现） | 4D Gaussian Splatting（pixel-aligned，时空联合） | 深度预测 GT + 法向量 GT + RGB 光度 loss（无显式流 GT） |

---

## 生成 / 扩散先验类

| 方法 | 公开时间 | 核心 Idea | 输入 | 输出 | 场景表征方法 | 监督信号 |
|---|---|---|---|---|---|---|
| **Geo4D** (arXiv 2025.04) | 2025.04 | **复用视频扩散模型的动态先验**：fine-tune 预训练视频 diffusion model 同时输出 point map / disparity / ray map 三路互补几何，多模态对齐融合，sliding window 支持长视频，仅合成数据训练即可 zero-shot 泛化真实场景 | 单目视频 | 逐帧点图 + 视差图 + 射线图（多模态几何） | 多模态几何点图（point / disparity / ray map） | 仅合成数据 GT，多模态 alignment loss，zero-shot 泛化真实数据 |
| **NeoVerse (CVPR 2026)** | 2026.01 | Pose-free 4DGS + 双向运动建模 + 在线单目退化模拟：以 VGGT 为 backbone"Gaussianize"化，引入双向速度编码（前向+后向线速度/角速度）精确插值稀疏关键帧间的 Gaussian，并在线模拟单目退化图案（Visibility Culling + Average Geometry Filter）作为生成模型的条件，使整条流水线可直接在 1M+ 野外单目视频上扩展训练，无需位姿标注或离线预处理，兼容重建+生成双任务 | 无位姿单目视频（稀疏关键帧） | 4D Gaussian 场景（重建）+ 新轨迹多视角视频（生成）+ 视频编辑/超分等下游应用 | 4D Gaussian Splatting（pose-free，双向运动建模，pixel-aligned） | RGB 光度 loss（重建分支）+ 视频扩散模型去噪 loss（生成分支，WAN 2.1 backbone）+ 在线退化模拟提供条件配对 |
| **UFO-4D (ICLR 2026)** | 2026.02 | 从两张无位姿图像做统一 4D 重建：核心洞见是用单个 Dynamic 3D Gaussian 表示可微分地同时渲染图像、深度、运动三路信号，实现外观-几何-运动紧耦合互正则，并自然引入自监督图像合成 loss 缓解 4D 标注稀缺。无需相机位姿输入，单次前向推理直接联合估计几何+运动+位姿 | 仅两张无位姿（unposed）图像 | Dynamic 3D Gaussian 场景（联合估计 3D 几何 + 3D 运动 + 相机位姿）+ 任意中间视角/时刻的时空插值渲染 | Dynamic 3D Gaussian Splatting（线性运动模型 + 常亮度假设，适合短时间间隔） | 稀疏 4D GT（Stereo4D）+ 自监督光度 loss（可微 4DGS 渲染的图像合成 loss）；训练数据混合 Stereo4D / PointOdyssey / Virtual KITTI 2 |
---

## Per-scene 优化类

| 方法 | 公开时间 | 核心 Idea | 输入 | 输出 | 场景表征方法 | 监督信号 |
|---|---|---|---|---|---|---|
| **Shape-of-Motion** (ECCV 2024) | 2024.07 | **SE(3) 运动基线性分解**：用紧凑 SE(3) motion basis 的线性组合表达每点完整 3D 运动，实现全序列持久显式 3D 轨迹；整合单目深度、长程 2D 轨迹等 noisy 先验为全局一致 4D 表示 | 单目视频（随手拍）| 全序列持久 3D 运动轨迹 + NVS 渲染 | 3D Gaussian + SE(3) 运动基（per-scene 优化） | 单目深度（先验）+ 长程 2D tracks（先验）+ 光度 loss |
| **4D-Fly** (CVPR 2025) | 2025.06 | **锚点传播 + 流式逐帧扩展，比原先优化方法快 20×**：anchor-based 传播将已有 dynamic Gaussian 扩展至下一帧，canonical Gaussian Map 初始化新 Gaussian，无需对齐 splatted 特征图，6 分钟处理数百帧 | 单目视频（数百帧） | 4D 场景地图（任意时刻 NVS）+ 点跟踪 | 3D Gaussian（动静分离，anchor 传播流式扩展） | 单目深度 + 分割 mask + 2D tracks（off-the-shelf）+ 光度 loss |
| **Uni4D** (arXiv 2025.03) | 2025.03 | **集成多个预训练视觉基础模型，无需重训练**：将 VLM / 视频深度 / 跟踪 / 分割模型输出视作 4D 世界的 2D 投影，三阶段 divide-and-conquer 能量最小化逐步引入位姿 → 静态 → 动态几何 | 单目视频（in-the-wild） | 相机位姿 + 静/动 3D 几何 + 稠密 3D 运动轨迹 | 静态 3DGS + 可变形动态 Gaussian（多阶段优化） | 多个基础模型输出作伪 GT（无任何 4D 标注） |

---

## 自监督 / 自我中心类

| 方法 | 公开时间 | 核心 Idea | 输入 | 输出 | 场景表征方法 | 监督信号 |
|---|---|---|---|---|---|---|
| **EgoMono4D** (arXiv 2025.03) | 2025.03 | **纯自监督自我中心单目 4D 重建**：将预训练单帧深度/内参模型扩展到视频，通过最小化"相机运动诱导的静态场景 3D flow"与"预计算 3D 对应关系"之间的差距对齐多帧，置信度 mask 自动排除动态区域，完全无标注训练 | 大规模无标签自我中心视频（Ego4D 等） | 相机内外参 + 逐帧深度图 + 点云序列 | 逐像素深度序列（点云序列） | 自监督：3D flow 一致性约束 + 多帧对应关系对齐（完全无 GT 标注） |

---

## 数据集

| 方法 | 公开时间 | 核心 Idea | 输入 | 输出 | 场景表征方法 | 监督信号 |
|---|---|---|---|---|---|---|
| **CORE4D** (arXiv 2024.06) | 2024.06 | **4D 人-物-人协作交互大规模数据集**：提出迭代协作动作迁移算法，将少量真实动作自动迁移到新物体几何，以 1K 真实序列生成 11K 协作序列，并给出运动预测 + 交互合成两个 benchmark | 多视角 RGBD + MoCap 系统采集 | 4D 人体运动序列 + 物体 mesh 序列 + 接触标注 | SMPL 人体参数 + DeepSDF 物体 mesh 序列 | MoCap GT（人体）+ 物体 mesh 重建 GT |