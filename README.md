# mini-webpack
webpack 学习

目标，分析依赖关系，将分开的代码打包成一个文件引入
1. 读到依赖，内容
2. 处理为图的结构
3. 创建输出模板 bundle.js,在浏览器中尝试是否可以渲染出来
4. 输出文件bundle.js 到 dist 中。

loader:
将JSON 变为 js
1.  配置文件
2.  loader 的本质就是 function
3.  
plugin:
通过一个时机，改变 webpack 中最终打包出的文件路径
   