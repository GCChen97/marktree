# Generation

## Geometric Latent Diffusion (GLD) ECCV26*
Repurposing Geometric Foundation Models for  Multi-view Diffusion
- Reuse the latent space of the intermediate features of a 3D foundation model for diffusion.
- Generate multi-view features conditioned on the features of partial views and decode them into RGB/Depth.

## VFMF: World Modeling by Forecasting Vision Foundation Model Features 2025
- 用VAE再次压缩DINO特征到更小维度从而训练生成模型, TC-AE也有一样的操作. 重建与生成对特征维度的长短要求是相反的.

## RAE

## VAE
拟合一个分布从而实现生成, 通过最大化数据的似然:
$$
\log p(x)
$$
而
$$
p(x) = \int p(x,z)dz
$$
无法直接计算, 因为$z$是长向量, 难以积分.
因此引入 $q(z|x)$, 使得
$$
\log p(x)=\log\int p(x,z)dz=\log\int q(z|x)\frac{p(x,z)}{q(z|x)}dz=\log\mathbb{E}_{q(z|x)}\big[\frac{p(x,z)}{q(z|x)}\big]
$$
**下文把 $q(z|x)$ 省略为 $q(z)$**.
利用Jensen不等式有:
$$
\log\mathbb{E}_{q(z)}\big[\frac{p(x,z)}{q(z)}\big]
\ge
\mathbb{E}_{q(z)}\big[\log\frac{p(x,z)}{q(z)}\big]
$$
通过不等式最大化右边, 能够间接最大化 $\log p(x)$ 从而拟合数据分布, 右边的项被称为ELBO.
$$
\begin{aligned}
\mathbb{E}_{q(z)}\big[\log\frac{p(x,z)}{q(z)}\big]
&=
\mathbb{E}_{q(z)}\big[\log p(x,z)\big]-\mathbb{E}_{q(z)}\big[\log{q(z)}\big]\\
&=
\mathbb{E}_{q(z)}\big[\log p(x|z)p(z)\big]-\mathbb{E}_{q(z)}\big[\log{q(z)}\big]\\
&=
\mathbb{E}_{q(z)}\big[\log p(x|z)\big]+\mathbb{E}_{q(z)}\big[\log p(z)\big]-\mathbb{E}_{q(z)}\big[\log{q(z)}\big]\\
&=
\mathbb{E}_{q(z)}\big[\log p(x|z)\big]-\big(\mathbb{E}_{q(z)}\big[\log q(z)\big]-\mathbb{E}_{q(z)}\big[\log{p(z)}\big]\big)\\
&=
\mathbb{E}_{q(z)}\big[\log p(x|z)\big]-\int q(z)log\frac{q(z)}{p(z)}dz\\
&=
\mathbb{E}_{q(z|x)}\big[\log p(x|z)\big]-\text{KL}\big(q(z|x)\|p(z)\big)
\end{aligned}
$$
由于 $\log p(x|z)\propto -\|x-\hat{x}\|^2$, 所以最终计算loss都是用MSE loss+KL loss, 二者的权重取决于是重重建还是重latent, diffusion中重建好不意味着生成就好.

# Video Diffusion

## Teacher Forcing

## Diffusion Forcing

## Self Foring

## Causal Forcing
