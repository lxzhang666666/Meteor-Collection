#!/usr/bin/env sh

# 确保脚本抛出遇到的错误
set -e


# push_addr=`git remote get-url --push origin` # git提交地址，也可以手动设置，比如：push_addr=git@github.com:xugaoyi/vuepress-theme-vdoing.git
# push_addr=git@github.com:lxzhang666666/Meteor-Collection.git
commit_info=`git describe --all --always --long`
dist_path=docs/.vuepress/dist # 打包生成的文件夹路径
push_branch=main # 推送的分支

# 生成静态文件
npm run build

# 进入生成的文件夹
cd $dist_path

# 如果手运行该脚本，则执行 if 里的，如果是 GitHub 自动执行该脚本，则是 else 里的
if [ -z "$GITHUB_TOKEN" ]; then
  msg='deploy 脚本部署'
  push_addr=git@github.com:lxzhang666666/Meteor-Collection.git
else
  msg='来自 Github actions 的自动部署'
  # 使用 HTTPS 协议并嵌入 token 进行认证
  push_addr="https://lxzhang666666:${GITHUB_TOKEN}@github.com/lxzhang666666/Meteor-Collection.git"
  git config --global user.name "lxzhang666666"
  git config --global user.email "1870287706@qq.com"
  # 禁用凭证助手，避免在 CI 环境中报错
  git config --global credential.helper ""
fi

git init
git add -A
git commit -m "deploy, $commit_info"
git push -f $push_addr HEAD:$push_branch

cd -