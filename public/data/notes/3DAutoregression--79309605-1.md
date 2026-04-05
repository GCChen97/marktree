
# GaussianGPT ECCV26*

## 网络和表征
- 使用Sparse 3D CNN实现VQVAE, 参考L3DG用lookup-free quantization (LFQ)提高codebook利用率和质量.
- 解藕几何和特征的解码, 交替输出position token和feature tokens, position head单独解码occupied voxel的位置
- 4D RoPE, 3D for position, 1D for token type
- 序列化是直接xyz.flatten(), 不用z/hilbert曲线, 实验表明用flatten最好, z次之, hilbert最差.猜测是flatten比较规律好学. 但是看交叉熵, 三者差别并不大.
- 自回归的transformer直接用GPT-2, voxel size是20cm, 上下文窗口16384 for scene, 8192 for object.

| **Ordering Strategy** | **Train CE ↓** | **Val CE ↓** |
|---|---:|---:|
| Z-order | 2.379 | 2.448 |
| Trans. Z-order | 2.379 | 2.445 |
| Hilbert | 2.467 | 2.497 |
| Trans. Hilbert | 2.462 | 2.493 |
| **xyz** | **2.346** | **2.444** |

## 数据
- Project aria的仿真场景. 用SceneSplat++优化的高斯场景
- 3D-Front, 渲染图片然后用Scaffold-GS重建高斯, 限制一个voxel一个高斯
- PhotoShape, 包含15576个椅子, 每个有200个渲染图

## 训练
- 使用teach forcing
- 由于使用VQVAE, 因此训练只需要使用交叉熵损失
- 训练资源消耗不算很大Autoencoder training uses 4 RTX A6000 GPUs, with an effective batch size of 8 for scenes and 24 for objects. Transformer training uses 4 GH200 GPUs with an effective batch size of 64. We train the autoencoder for around 4 days on scenes and 2 days on PhotoShape. GPT training takes around 1 day on scenes and 4.5 hours on PhotoShape.
