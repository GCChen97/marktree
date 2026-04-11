# 3DReconFeedforward

## Pi3
pi3不使用DPT解码, 其decoder使用transformer+MLP+pixel unshuffle, 因此输出的point map边缘锐利.

## DA v3
- 直接估计scale-shift-invariant depth, depth 表示在log空间从而降低平衡远近的loss大小.
- 没有pi3的permutation-invariant性质
- Dual-DPT, assemble之后两个分支, 一个decode depth, 一个decode 6 dims depth ray map.

## 长序列优化
这7个方法本质上围绕同一个瓶颈——VGGT 的全局注意力是 O(N²L²) 的，从三条不同路线突破：

1. **加速注意力本身**（AVGGT、FlashVGGT）：分析注意力冗余，压缩或精简计算，适合中等长度的密集场景。
2. **分块+外部对齐**（VGGT-X、VGGT-Long、VGGT-SLAM 2.0）：保持原始模型不变，在外部用 pose graph / 回环闭合拼接子地图，工程实用性强但多为离线。
3. **改造为流式架构**（InfiniteVGGT、LoGeR）：从模型层面重新设计，InfiniteVGGT 用因果 KV 缓存，LoGeR 用 TTT 记忆，是走得最远的两个方向。

| 方法 | 发表时间 | 类型 | 核心长序列策略 | 具体技术手段 | 内存/计算优化 | 局限 & 适用场景 | 支持规模 |
|---|---|---|---|---|---|---|---|
| VGGT-X | 2025.09 | 密集 NVS | 内存高效推理 + 自适应全局对齐 | 去除冗余中间特征缓存；降低数值精度；批量帧操作；自适应全局对齐（epipolar 约束）提升输出质量；联合位姿与 3DGS 优化 | 推理吞吐从 ~150 张升至 1000+ 张；VRAM 大幅降低（原 20→200 图需 5.6→40.6 GB） | 依赖后端 3DGS 训练；主要面向无 COLMAP 密集新视角合成，而非超长视频流 | 1000+ 张 |
| VGGT-SLAM 2.0 | 2026.01 | 实时 SLAM | 因子图后端 + 注意力辅助回环检测 | 修复 VGGT-SLAM 的 15-DoF SL(4) 漂移和平面退化；重新设计纯位姿因子图；利用 VGGT 内部注意力层做图像检索验证（免训练），拒绝误回环、补充漏检回环 | 子地图（submap）滑窗，峰值内存与总帧数解耦；约 120 ms/帧（RTX 3090，submap=16） | 仅位姿优化，无点云 BA；无纹理/纯白场景仍会发散；主要面向室内及小规模室外 | km 级连续流 |
| AVGGT | 2025.12 | Attention 加速 | 层级角色分析驱动的免训练注意力精简 | ① 前 9 层 global attention 转为 frame attention（分析显示其无跨视角关联贡献）；② 剩余中间层做 K/V 网格下采样，保留对角线自注意 + mean-fill token 补偿丢弃信息 | 8–10× 推理加速；免训练；密集多视角（800+ 图）下其他稀疏注意力基线失效但 AVGGT 仍鲁棒 | 本身不解决超长时序漂移，需配合滑窗/分块方案使用 | 无上限（加速层） |
| FlashVGGT | 2025.12 | Attention 加速 / 流式推理 | 压缩描述符注意力 + chunk 递归在线推理 | 将全局 self-attention 替换为：每帧特征经双线性插值压缩为描述符集，全 token 以 cross-attention 查询描述符；缓存描述符支持流式追加新帧，无需重算历史 | 1000 图推理 35.3 s（vs VGGT 397 s），超 10× 加速；可处理 3000+ 帧在线流；精度优于 FastVGGT / Fast3R | 描述符压缩损失局部细节；无显式回环，长距离漂移依赖外部处理 | 3000+ 帧 |
| VGGT-Long | 2025.07 | 分块对齐 | Chunk 分块 + 重叠对齐 + 轻量回环闭合 | "Chunk it, Loop it, Align it"：固定大小分块逐段推理，相邻块重叠区域做 Sim(3) 对齐，全局 pose graph 优化处理回环；中间结果落盘以规避 CPU OOM | GPU 显存不随总帧数增长；无需重训/标定/深度监督；磁盘换内存（~50 GB for 4500 帧） | 离线批处理为主；磁盘 I/O 速度影响总时长；动态物体和稀疏帧对应仍有挑战 | 4500+ 帧 / km 级 |
| InfiniteVGGT | 2026.01 | 滚动 KV 缓存 | 因果 Transformer + 有界自适应 KV 缓存 | 将 VGGT 改为因果（causal）注意力结构，引入"rolling memory"：维护有界 KV 缓存，自适应驱逐旧帧信息，新帧持续追加；引入 Long3D benchmark（~10000 帧）用于评测 | 内存恒定（有界缓存）；支持真正 infinite-horizon 推理；长期稳定性优于现有流式方法 | 因果结构丧失双向推理能力，局部细节精度低于离线双向模型；极长序列累积漂移仍是挑战 | 理论无限（~10000 帧验证） |
| LoGeR | 2026.03 | 混合记忆 / 分块处理 | Chunk 双向骨干 + 混合记忆模块（SWA + TTT） | 视频分块后块内保留双向注意力；块间用双路混合记忆桥接：① SWA 保留无压缩近邻上下文做精确局部对齐；② TTT 参数化记忆持续更新全局坐标系、抑制尺度漂移 | 无任何后处理优化（fully feedforward）；19000 帧无漂移；7-Scenes 上比 TTT3R 误差降低 69.2% | 端到端训练需长序列数据（以 chunk 分解绕过数据瓶颈）；TTT 压缩记忆在极长程细节上仍有损失 | 19000+ 帧 / km 级 |
| Fast3R | 2025.01 | 并行多视角重建 | N 张图像单次前向传播，消除成对处理和全局对齐后处理** | 基于 DUSt3R 改造为多视角并行 Transformer：所有帧同时相互 attend，在单次 forward pass 中联合预测所有帧的 pointmap；消除 DUSt3R 的 O(N²) pairwise 匹配和全局对齐优化步骤 | 无需全局对齐后处理，速度和内存均大幅优于 DUSt3R；性能随输入视角数增大而提升（view-axis scaling） | 仍受二次注意力复杂度约束，超长序列（>300 帧）会 OOM；无流式推理机制，本质仍是批处理；在极长序列漂移问题上不如专门针对长序列设计的方法 | 1000+ 张 |
| FastVGGT | 2025.09 | Attention 加速 | Token 合并（Token Merging）消除全局注意力冗余 | 观察到 VGGT 全局注意力图中存在"token collapse"现象（大量 token 关注几乎相同区域）；设计三类 token 分组策略：① 保留第一帧 token 作为稳定全局参考；② 保留显著 token 维持细节；③ 区域随机采样保证空间均匀覆盖；src token 按余弦相似度合并到最近 dst token | 1000 图下 4× 推理加速；同时缓解长序列误差累积；ICLR 2026；免训练 | 跨帧 token 合并前需计算相似度，引入额外开销（在极短序列反而比 VGGT 慢）；AVGGT 和 FlashVGGT 在密集多视角下精度均优于 FastVGGT | 1000+ 帧 |
| StreamVGGT | 2025.07 | 因果流式推理 | 将 VGGT 改造为自回归因果 Transformer，以 KV 缓存替代全序列重算，实现真正的逐帧在线重建 | 将全局 self-attention 替换为时序因果注意力（temporal causal attention）；每帧新到时仅前向一次，历史帧的 K/V 追加缓存作为隐式记忆，无需重处理历史帧；以 VGGT（双向）为教师做知识蒸馏训练因果学生模型，弥补因果结构丢失的全局上下文损失；支持 FlashAttention-2 算子直接迁移（与 LLM 推理栈兼容） | 每帧延迟低，性能接近离线 VGGT；ICLR 2026 | KV 缓存随序列长度线性增长（无界），极长序列内存和延迟同步攀升——这是其被 InfiniteVGGT、XStreamVGGT、Evict3R 等后续工作重点攻克的核心局限；无显式回环，长距离漂移积累 | 理论无限，实际受 KV 缓存内存约束 |
| XStreamVGGT | 2026.01 | KV 缓存压缩（剪枝 + 量化） | 对 StreamVGGT 的 KV 缓存做联合剪枝与量化，将无界线性增长压缩为固定内存预算，免训练插件式使用 | 每到新帧时，用全局注意力层的 Query 做均值池化后与 Key 匹配，估算各历史 token 重要性；驱逐低重要性 KV 对，始终保留第一帧 KV 保持几何一致性；剩余 KV 再用 INT4 分组量化（Key 按通道、Value 按 token 各自量化以应对通道异常值） | 内存降低 4.42×，推理加速 5.48×；在 80 GB A100 上 StreamVGGT 约 300 帧即 OOM，XStreamVGGT 可持续运行无 OOM；几乎无精度损失 | 免训练但量化精度依赖 KV 分布假设；属于 StreamVGGT 的后处理插件，本身不解决因果结构带来的长程漂移 | 理论无限（有界预算） |
| Evict3R | 2025.09 | KV 缓存 Token 驱逐 | 对 StreamVGGT 的 KV 缓存施加逐层 token 预算，用基于注意力的重要性评分在推理时驱逐冗余 token，免训练即插即用 | 对每个全局注意力层独立分配 KV token 预算（稀疏度越高的层预算越紧）；新帧到来时以累积注意力分数（加 exposure/length 归一化）为重要性排名，驱逐最低分 token；始终保留一批"固定重要 token"（第一帧等关键锚点）维持全局一致性 | 7-Scenes 长序列下峰值内存从 18.63 GB 降至 9.39 GB；精度与完整度仅降 0.003；极严苛预算下密集采样帧反而让重建精度超过原始 StreamVGGT | 依赖注意力分数作为重要性代理，极端长程下存在注意力偏差风险；属于 StreamVGGT 的推理插件，不修改模型权重 | 理论无限（有界预算） |