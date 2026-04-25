# 3DRepresentation

## Geometry Distributions ICCV 2025 张彪
用一个分布表示表面点的分布, 用diffusion建模这个分布, 跟nova3r异曲同工.

文章用了很多MPxxx模块, 是来源于 "EDM2: Analyzing and Improving the Training Dynamics of Diffusion Models", MP指magnitude-preserving, 让每个模块的输入输出的范数相同, 让diffusion的训练稳定.
