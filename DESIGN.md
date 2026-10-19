---
name: 拾词
description: 以留白、细线和清楚的文字支持随手记录与主动回忆。
colors:
  background: "#fcfcfc"
  ink: "#242624"
  muted: "#6c716d"
  line: "#e8ebe7"
  soft: "#f2f4f1"
  green: "#49664c"
  danger: "#9d473d"
typography:
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "14px"
    fontWeight: 400
  label:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "13px"
    fontWeight: 400
  title:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "24px"
    fontWeight: 500
    letterSpacing: ".02em"
  input:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "22px"
    lineHeight: 1.5
  word:
    fontFamily: 'Georgia, "Times New Roman", serif'
    fontSize: "23px"
    fontWeight: 400
    lineHeight: 1.3
  review-word:
    fontFamily: 'Georgia, "Times New Roman", serif'
    fontSize: "46px"
    fontWeight: 400
    lineHeight: 1.2
  completion-word:
    fontFamily: 'Georgia, "Times New Roman", serif'
    fontSize: "20px"
    lineHeight: 1.25
  completion-meaning:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "12px"
    lineHeight: 1.5
rounded:
  field: "8px"
  control: "10px"
  dialog: "16px"
spacing:
  compact: "8px"
  small: "12px"
  medium: "16px"
  section: "24px"
  page: "32px"
  wide: "48px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "0 23px"
    height: "44px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 19px"
    height: "42px"
  button-secondary-hover:
    backgroundColor: "{colors.soft}"
  entry-input:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.input}"
    rounded: "0"
    padding: "12px 2px"
    height: "60px"
  dialog-field:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "11px 12px"
  dialog:
    backgroundColor: "{colors.background}"
    textColor: "{colors.ink}"
    rounded: "{rounded.dialog}"
    padding: "27px 30px 30px"
    width: "min(500px, calc(100vw - 32px))"
---

# Design System: 拾词

## Overview

**Creative North Star: "随手一笔"**

拾词是安静、直接的个人记录工具。界面用接近白色的背景、深灰文字和宽松留白承载内容，结构来自文字对齐与细线。绿色只提示与记忆有关的状态，让输入、单词与判断动作始终清楚。

中文界面使用系统无衬线，英文词条使用 Georgia。字号差异服务于当前任务：记录时突出输入，查看时突出词条，回忆时突出正在想的单词。页面组成和首屏约束见 `.impeccable/surface.md`；本文件记录可复用的视觉系统，以 `docs/styles.css` 的已实现值为依据。

**Key Characteristics:**

- 留白组织层次，细线组织列表。
- 文字导航、明确动词、少量状态色。
- 英文单词与中文解释分工清楚。
- 主体平面化，弹窗与短暂反馈才使用阴影。

## Colors

配色以白灰为主体，低饱和绿色承载积极反馈，砖红色承担错误提醒。具体值以 frontmatter 为准。

### Primary

- **记忆绿**（`green`）：记录成功、顽固词次数、复习反馈、待复习数量及焦点轮廓；不作为整页或大面积容器底色。

### Neutral

- **近白底**（`background`）：页面与弹窗共用的主要底色。
- **炭墨**（`ink`）：正文、当前导航及主要按钮，保证当前动作有明确重量。
- **石灰字**（`muted`）：辅助解释、占位文字、次要动作、时间和计数。占位文字必须保持可读，不使用更浅的装饰灰。
- **雾线**（`line`）：词条分隔及弹窗边界。
- **浅雾面**（`soft`）：次级按钮和图标按钮的悬停反馈。

错误色 `danger` 仅用于校验、保存或导入失败等需要处理的信息。

**The Semantic Green Rule.** 绿色必须传达状态或交互反馈；新增页面不能靠扩大绿色面积来制造视觉重点。

## Typography

**Body Font:** 系统中文无衬线栈，随操作系统使用适合中文的字体。

**Word Font:** Georgia，以 Times New Roman 和系统衬线体回退，只用于英文词条。

正文以常规字重为主，标题和主要按钮使用中等字重。界面没有独立的大展示字体系，也没有全大写、宽字距的装饰标签。

### Hierarchy

- **Title**：词本页标题及同级小标题；移动端词本标题缩为（22px）。
- **Body / Label**：正文与操作说明多为（13–14px），时间、计数和快捷键提示为（10–12px）；说明段落行高通常为（1.7–1.9）。
- **Input**：首页输入的独立层级；移动端输入缩为（20px），占位文字为（16px），最窄断点为（14px）。
- **Word**：列表英文词条；移动端为（22px）。刚记录的单词为（24px），移动端为（22px）。
- **Review Word**：当前回忆的唯一大字；移动端缩为（40px）。

**The Word First Rule.** 衬线与大字号用于识别英文单词；中文导航、释义与说明保持系统无衬线。

## Layout

全局页头保持单行，品牌在左，文字导航和备份入口在右。桌面页头高（88px）、水平内边距（48px）；移动端高（76px）、水平内边距（22px）。

内容按任务采用独立宽度：记录区域最大（660px），大屏断点扩至（720px）；词本容器最大（960px），两侧内边距（32px）；复习区域最大（660px）。记录和复习区域在可视高度内居中，并为底部留出更多空间，视觉中心略高于屏幕中线。

列表是单列细线结构。桌面每行由词条与释义、遗忘次数、操作组成，主内容内部再按两列对齐；移动端词义落到单词下方，次数和操作仍保持靠右。搜索在移动端单独占一行。

响应式断点为（700px）、（370px）和大屏（1600px）。窄屏减少横向间距、字号与按钮内边距，长单词及长释义允许换行。更完整的首屏与状态约定见 surface 记录。

## Elevation & Depth

记录、词本和复习的主体没有卡片阴影，也不靠叠放制造深度。细线、间距和字重建立信息层级。仅原生模态弹窗与底部通知有轻量阴影，弹窗背后使用半透明遮罩；准确阴影、遮罩与动效值记录于 `.impeccable/design.json`。

**The Flat Content Rule.** 持续展示的业务内容保持平面；浮层的深度只表达临时覆盖关系。

## Shapes

首页输入是平直的单条底线，不带包围式外框。列表用横向细线分隔。按钮使用温和圆角；普通表单字段更紧凑，弹窗圆角更宽。圆形只出现在小品牌点和复习完成标记等局部。

线性图标采用圆端点与圆连接，常规尺寸（20px），搜索图标为（16px）。图标限于朗读、搜索、关闭与完成等有意义的动作或状态。

## Components

### Buttons

主要按钮为炭墨实底、白色文字，明确写出「记一笔」「看词义」「记得」「保存」等动作。次级按钮为透明底与浅灰描边，悬停使用浅雾面。小型操作以无底色文字按钮呈现，图标按钮为（36px）方形点击区。

悬停反馈轻微变暗；主要按钮按下时下移（1px）。空输入时「记一笔」使用灰底禁用态。通用键盘焦点为绿色（2px）轮廓，偏移（5px）；具体输入控件采用自己的底线或边框焦点态。

### Inputs / Fields

首页入口只保留底线；聚焦时底线转深。输入为空时按钮禁用，非法内容在输入下方以错误文字和 `aria-invalid` 呈现。占位文字使用 `muted`，不能降低透明度。

输入两个英文字母后才出现补全浮层，空首页保持原样。候选以英文词语和一行中文释义组成，不加图标或额外标题；词本里的词优先显示，完整匹配优先。浮层使用白底、细线和轻量阴影，响应手机键盘可翻转到输入上方。支持方向键、回车、Escape 和触控；输入通过 combobox/listbox 语义关联高亮候选。点击候选直接记录，并自动带入词义和音标。

编辑弹窗使用白底、浅灰细边框字段，聚焦时边框和紧贴边缘的轮廓转为浅绿。词义与助记是可伸缩多行输入，所有字段有明确标签。

### Navigation

导航为普通文字链接，当前页文字变深并带短下划线。词本数量为小号数字；有待复习内容时出现浅绿数量标记。移动端隐藏词本总数以节省空间，仍保留待复习提示。筛选按钮沿用文字加短下划线的方式，不使用分段胶囊。

### Word List

英文词、中文词义、遗忘次数和「又忘了」各自对齐。点击词条内容可编辑。顽固词仅通过次数文字变绿表达状态，悬停使英文词变绿；不新增彩色背景或独立卡框。

### Record Receipt

记录成功后才在输入下方显示刚录入的单词、累计遗忘次数、释义或补充提示，以及编辑和撤销动作。反馈直接进入留白区，没有容器外框。短暂入场动效为（180ms），减少动态效果偏好下关闭。

### Recall Stage

复习区域没有卡框。先显示英文词、可选音标、朗读和回忆提示；用户触发后才出现释义与助记，再显示判断按钮。新内容渲染后将键盘焦点移至新词义、单词或完成标题。缺少词义时给出补充入口，并暂停记忆判断。

### Dialogs & Feedback

编辑和备份使用原生 `dialog`。标题、字段及底部动作保持清楚的纵向顺序，遮罩只在弹窗打开时出现。底部通知用于保存、撤销和复习安排等即时反馈。持久化问题在页头下方显示持续告警，不仅依赖通知。

## Do's and Don'ts

### Do:

- **Do** 让当前任务的输入、单词或判断动作成为清楚的视觉中心。
- **Do** 使用文字、留白和细线延续现有层级。
- **Do** 保持占位文字可读、焦点可见，长内容能在窄屏换行。
- **Do** 在完成用户操作后提供准确、简短且可访问的反馈。
- **Do** 尊重减少动态效果偏好，保留完全静态的操作路径。

### Don't:

- **Don't** 把已废弃的索引卡、彩色叠卡或旧效果图当作当前设计依据。
- **Don't** 在首页加入大标题、固定标语、装饰面板或预置演示词本。
- **Don't** 复制参考图的聊天输入外壳、分段导航或无意义加号。
- **Don't** 把列表或复习区域改成带阴影的大卡片。
- **Don't** 将语义状态扩展为整片装饰色，也不使用责备遗忘的视觉或文案。
