# Flow matching

Flow matching一般定义为真实数据点到先验分布点的流动过程, 即时刻0是数据点, 时刻1是随机点.
定义流动路径为
$$
z_t=a_tx+b_t\epsilon
$$
$a_t$和$b_t$是时间相关的系数.
流动的速度是
$$
v_t=z_t'=a_t'x+b'_t\epsilon
$$
$v_t(z_t|x)$ 是条件速度, 因为路径取决于输入数据点 $x$.

通常$a_t$和$b_t$的选取是为了满足某些数学性质, 例如保证路径的平稳性, 或者使得路径上的分布满足某些特定的形式.
一种常用的schedule是 $a_t=1-t, b_t=t$, 使得 $v_t=\epsilon-x$.

由于随机性, 给定一个路径点 $z_t$ 及其速度 $v_t$, $z_t$ 实际上可以对应多个可能的 $x$ 和 $\epsilon$ 的组合, 因此 flow matching 实际上建模的所有可能的组合的期望, 即边缘速度 (marginal velocity):
$$
v(z_t, t)\triangleq\mathbb{E}_{p_t(v_t|z_t)}\big[v_t\big].
$$
参数为 $\theta$ 的模型 $v_\theta(z_t,t)$ 通过最小化模型预测的速度与边缘速度之间的差异来训练, 因此训练的loss是
$$
\mathcal{L}_{FM}(\theta)=\mathbb{E}_{t,p_t(z_t)}\big[\|v_\theta(z_t,t)-v(z_t,t)\|^2\big].
$$
由于 $v(z_t,t)$ 是一个期望, 直接计算很困难, 因此使用转而预测条件速度
$$
\mathcal{L}_{CFM}(\theta)=\mathbb{E}_{t,x,\epsilon}\big[\|v_\theta(z_t,t)-v_t(z_t|x)\|^2\big].
$$
有理论证明 $\mathcal{L}_{CFM}$ 的最优解也是 $\mathcal{L}_{FM}$ 的最优解, 因此可以通过最小化 $\mathcal{L}_{CFM}$ 来训练模型 $v_\theta$.

给定一个边缘速度场 $v(z_t,t)$, 可以从随机点 $z_1=\epsilon\sim p_{\text{prior}}$出发, 通过求解下面的ODE来生成数据点:
$$
\frac{d}{dt}z_t=v_\theta(z_t,t).
$$

解的一般形式是
$$
z_r=z_t-\int^t_r v_\theta(z_\tau,\tau)d\tau.
$$
用数值方法求解这个ODE, 例如欧拉法, 可以得到
$$
z_{t-\Delta t}=z_t-v_\theta(z_t,t)\Delta t.
$$
通过不断迭代这个过程, 可以从随机点 $z_1$ 逐步生成数据点 $z_0$.

## MeanFlow
上面所描述的速度是瞬时的, 而MeanFlow建模的则是从任意时刻 $r$ 到任意时刻 $t$ 的平均速度, 定义为
$$
u(z_t,r,t)\triangleq\frac{1}{t-r}\int^t_r v(z_\tau,\tau)d\tau.
$$
这样, 可以通过 $u$ 从任意时刻一步转移到任意时刻, 而不需要逐步迭代.

Meanflow实现通过瞬时速度来计算平均速度, 其中的关键概念是 **The MeanFlow Identity**.


## Improved MeanFlow
MeanFlow的一个问题是它需要对每个时刻 $t$ 计算一个平均速度 $u(z_t,r,t)$, 这在训练和推理时都可能带来额外的计算开销. Improved MeanFlow通过引入一个辅助函数 $w(z_t,r,t)$ 来近似平均速度, 从而避免了对每个时刻计算平均速度的需求. 具体来说, Improved MeanFlow定义了一个新的损失函数
$$
\mathcal{L}_{IMF}(\theta)=\mathbb{E}_{t,x,\epsilon}\big[\|w_\theta(z_t,r,t)-u(z_t,r,t)\|^2\big].
$$
通过最小化 $\mathcal{L}_{IMF}$ 来训练模型 $w_\theta$. 这个方法的核心思想是通过引入一个辅助函数来近似平均速度, 从而减少了计算开销, 同时仍然能够保证模型的性能.
