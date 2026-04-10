

# 联系方式去重

## 方案

在已有的设备 ID 去重基础上，新增数据库触发器：同一 `contact_phone` 或 `contact_wechat` 在同一 `category` 下只允许一条 `is_visible = true` 的活跃帖子，不论哪个账号发的。

## 实施步骤

### 1. 数据库迁移
创建触发器函数 `check_duplicate_contact()`：
- 若 `contact_phone` 非空，检查同 category 下是否已有活跃帖子使用该号码（排除自身 id）
- 若 `contact_wechat` 非空，同理检查
- 命中则 `RAISE EXCEPTION 'CONTACT_DUPLICATE: ...'`
- 触发器挂在 INSERT 前（编辑用 UPDATE 不受影响）

### 2. 前端错误处理
**文件：`src/pages/CreatePost.tsx`**
- submit 错误处理中新增 `CONTACT_DUPLICATE` 匹配
- 显示提示："该联系方式在此分类下已有活跃信息，请勿重复发布"

## 涉及文件
| 文件 | 操作 |
|------|------|
| 数据库迁移 | 新建触发器函数 + 触发器 |
| `src/pages/CreatePost.tsx` | 错误处理增加一个分支 |

