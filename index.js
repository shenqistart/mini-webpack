import fs from "fs";
import path from "path";
import ejs from "ejs";
import parser from "@babel/parser";
import traverse from "@babel/traverse";
import { transformFromAst } from "babel-core";
import { jsonLoader } from "./jsonLoader.js";
import { ChangeOutputPath } from "./ChangeOutputPath.js";
import { SyncHook } from "tapable";
let id = 0;

const webpackConfig = {
  module: {
    rules: [
      {
        test: /\.json$/,
        use: [jsonLoader],
      },
    ],
  },

  plugins: [new ChangeOutputPath()],
};

const hooks = {
  emitFile: new SyncHook(["context"]),
};

function createAsset(filePath) {
  // 1. 获取文件的内容
  //    ast -> 抽象语法数

  let source = fs.readFileSync(filePath, {
    encoding: "utf-8",
  });

  // initLoader jsonloader
  const loaders = webpackConfig.module.rules;
  const loaderContext = {
    addDeps(dep) {
      console.log("addDeps", dep);
    },
  };

  loaders.forEach(({ test, use }) => {
    if (test.test(filePath)) {
      // 因为可能有多个loader，所以需要遍历
      if (Array.isArray(use)) {
        use.forEach((fn) => {
          source = fn.call(loaderContext, source);
        });
      }
      // source = fn.call(loaderContext, source);
    }
  });

  // console.log(source)

  //   console.log(source);
  // 2. 获取依赖关系
  const ast = parser.parse(source, {
    sourceType: "module",
  });
  //   console.log(ast);
  // 从上面的树结构，获得依赖关系 "./foo.js"
  const deps = [];
  // 获取树中的变量
  traverse.default(ast, {
    ImportDeclaration({ node }) {
      console.log(node, "node");
      deps.push(node.source.value);
    },
  });
  // 拼接代码,需要将 import 转换为 seajs 的模块规范,preset-env
  const { code } = transformFromAst(ast, null, {
    presets: ["env"],
  });

  return {
    filePath,
    code,
    deps,
    mapping: {},
    id: id++,
  };
}
// 因为这里代码可能会有互相引用的逻辑，所以使用图的数据结构
function createGraph() {
  const mainAsset = createAsset("./example/main.js");

  const queue = [mainAsset];
  console.log(queue, "queue", mainAsset);
  for (const asset of queue) {
    asset.deps.forEach((relativePath) => {
      const child = createAsset(path.resolve("./example", relativePath));
      asset.mapping[relativePath] = child.id;
      queue.push(child);
    });
  }

  return queue;
}

function build(graph) {
  const template = fs.readFileSync("./bundle.ejs", { encoding: "utf-8" });
  const data = graph.map((asset) => {
    const { id, code, mapping } = asset;
    return {
      id,
      code,
      mapping,
    };
  });
  //   console.log(data)
  const code = ejs.render(template, { data });

  let outputPath = "./dist/bundle.js";

  // plugin 中处理的事情 怎么改变输出的路径
  const context = {
    changeOutputPath(path) {
      outputPath = path;
    },
  };
  hooks.emitFile.call(context);
  fs.writeFileSync(outputPath, code);
}
function initPlugins() {
  const plugins = webpackConfig.plugins;

  plugins.forEach((plugin) => {
    plugin.apply(hooks);
  });
}

initPlugins();
const graph = createGraph();

build(graph);
