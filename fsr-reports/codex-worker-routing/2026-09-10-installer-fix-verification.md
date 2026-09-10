# 安装器修复验证 · 2026-09-10

FSR-001、FSR-002 已在当前工作区修复；未安装到真实用户配置，未提交或推送。基于 375ce3e 的未提交修改，历史审计报告保持原样。

- 状态校验移到旧状态删除之后，解决 Bash 5.2 启停转换失败。
- 新增 scripts/install-recovery.sh：在首次受管文件变更之前，原子发布临时恢复记录，绑定源码内容、HOME/CODEX_HOME、命令及目标状态。重跑原命令可继续完成已知操作；活动安装进程、未知文件、已改动备份、不同命令或源码会拒绝。
- 记录只按数据读取，不执行其中的内容。清理限定在受管路径的已记录暂存/备份文件，并验证其内容。普通失败沿用原有回滚；从中断状态继续时若再次失败，保留恢复依据。
- 临时记录和已记录的旧暂存/备份在成功后删除。没有扩展 profile、Provider、凭据或 Skill 的安装范围。

## 验证

标准库回归脚本 tests/test_install.py，在 Bash 3.2.57 和 Bash 5.2.37 下各通过 35 组。原始输出见同目录 2026-09-10-bash3-regression.txt 与 2026-09-10-bash5-regression.txt。

覆盖新装、双向开关、all、重复操作、旧版本升级；15 个受管变更点后的 SIGKILL 与重跑；首次记录发布后的中断；普通失败、INT/TERM/HUP 回滚；恢复再失败后继续；未知目标/备份、错误命令、活动进程时拒绝。Shell 语法和 git diff --check 通过。

命令：

```sh
python3 tests/test_install.py
INSTALL_TEST_BASH=/tmp/bash-5.2.37/bash python3 tests/test_install.py
bash -n scripts/install.sh scripts/install-recovery.sh scripts/update.sh
git diff --check
```

## 限制

实际验证是 SIGKILL 故障注入，不是物理断电或磁盘写缓存持久性测试；仍不承诺跨目录断电原子性。恢复要求原源码、目录和参数。旧安装器已留下但没有恢复记录的部分状态不能安全推断，仍需人工处理。记录发布前中断不会修改受管目标，但可能遗留未记录的暂存文件，本次不加入自动扫描删除机制。未进行新的真实模型路由测试。

按用户后续指示，本次修复未继续使用网页端 ChatGPT；验证和最终验收由当前 Agent 完成。
