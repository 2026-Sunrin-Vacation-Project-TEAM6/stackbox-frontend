<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# StackBox — AGENTS.md

## 1. Project Overview

StackBox는 Notion + FigJam + Colab의 개념을 하나의 Workspace로 통합한 생산성/개발 플랫폼이다.

핵심 기능:

* Markdown 기반 문서 편집
* FigJam 스타일의 Infinite Canvas
* 문서 내부에서 실행 가능한 Code Block
* AI를 활용한 PPT 제작
* GitHub 연동
* 실시간 협업

StackBox는 단순한 "Notion clone"을 만드는 것이 목표가 아니다.

**Notion, AFFiNE, FigJam의 UI를 그대로 모방하지 않는다.**

StackBox만의 Workspace 경험을 만드는 것을 최우선으로 한다.

---

# 2. Design Philosophy

## 2.1 Digital Brutalism

StackBox의 Brutalism은 단순히 검정색, 굵은 테두리, 네모난 버튼을 사용하는 디자인 스타일을 의미하지 않는다.

핵심은:

> **UI의 정직함**

이다.

불필요한 장식, 과도한 그림자, Glassmorphism, Gradient, 과도한 애니메이션을 지양한다.

UI는 기능과 구조를 명확하게 보여줘야 한다.

### 지양

* 과도한 gradient
* Glassmorphism
* 지나치게 둥근 카드
* 장식 목적의 blur
* 불필요한 floating UI
* 의미 없는 애니메이션
* 과도한 아이콘 사용
* SaaS 템플릿처럼 보이는 UI

### 권장

* 명확한 영역 구분
* 강한 시각적 hierarchy
* 충분한 여백
* 명확한 typography
* 단순한 색상 체계
* 기능 중심의 UI
* 필요할 때만 나타나는 contextual control

---

# 3. Progressive Disclosure

StackBox는 기능이 많기 때문에 모든 기능을 한 번에 보여주지 않는다.

핵심 원칙:

> **Simple on the surface, powerful underneath.**

처음에는 사용자가 현재 작업에 필요한 최소한의 UI만 볼 수 있어야 한다.

사용자의 행동에 따라 추가 기능을 단계적으로 공개한다.

예:

```text
기본 상태

┌─────────────────────────┐
│ Python              ▶   │
│                         │
│ print("Hello")          │
└─────────────────────────┘
```

Hover:

```text
┌─────────────────────────┐
│ Python      Run     ⋮   │
│                         │
│ print("Hello")          │
└─────────────────────────┘
```

More menu:

```text
Run
Run with...
Environment
Packages
Input
Output
Terminal
```

즉, 기능을 없애는 것이 아니라 **필요할 때까지 숨긴다.**

---

# 4. Content First

StackBox에서 사용자가 만든 콘텐츠가 UI보다 중요하다.

화면을 UI 요소로 가득 채우지 않는다.

문서, 코드, Canvas 등의 콘텐츠가 화면의 중심이 되어야 한다.

툴바, 사이드바, 메뉴는 콘텐츠를 방해하지 않는 범위에서 제공한다.

가능하다면 contextual UI를 사용한다.

---

# 5. Contextual UI

현재 사용자가 무엇을 하고 있는지에 따라 UI가 변화해야 한다.

예:

* Text를 선택하면 Text 관련 도구
* Code Block을 선택하면 Code 관련 도구
* Canvas Object를 선택하면 Canvas 관련 도구
* Slide를 선택하면 Slide 관련 도구

모든 기능을 항상 상단 Toolbar에 넣지 않는다.

---

# 6. Command-driven Interaction

StackBox는 마우스만으로 모든 기능을 찾도록 설계하지 않는다.

Command 기반 인터랙션을 적극적으로 사용한다.

주요 인터랙션:

```text
/
⌘K / Ctrl+K
Command Palette
Context Menu
Keyboard Shortcut
```

예:

```text
/
```

를 입력하면 Block 생성 메뉴가 나타난다.

```text
/ code
/ canvas
/ image
/ table
/ slide
/ ai
```

등을 통해 콘텐츠를 빠르게 생성할 수 있어야 한다.

---

# 7. Composable Everything

StackBox의 핵심 개념은 Block이다.

모든 콘텐츠는 조합 가능한 단위로 취급한다.

예:

```text
Workspace
 ├── Text Block
 ├── Code Block
 │    └── Output
 ├── Image Block
 ├── Canvas Block
 └── AI Block
      └── Slide
```

문서, 코드, Canvas, AI 결과물 등이 서로 독립된 앱처럼 느껴지지 않아야 한다.

---

# 8. Surface-based Workspace

StackBox는 전통적인 SaaS의

```text
Sidebar → Page → Editor
```

구조를 그대로 복제하지 않는다.

Workspace 안에서 여러 Surface를 사용할 수 있는 구조를 지향한다.

예:

```text
Workspace
 ├── Document Surface
 ├── Canvas Surface
 ├── Code Surface
 └── Slide Surface
```

사용자는 다른 앱으로 이동하는 것이 아니라 하나의 Workspace 안에서 작업한다.

---

# 9. Visual Direction

StackBox의 전체적인 인상:

* Brutalist
* Minimal
* Technical
* Functional
* Editorial
* Slightly raw
* Dense but not cluttered
* Developer-friendly

단, "개발자 도구처럼 보이는 것"과 "복잡해 보이는 것"은 다르다.

복잡한 기능을 제공하되 UI는 단순해야 한다.

---

# 10. Color System

StackBox의 기본 색상은 다음과 같다.

```text
Text       #050315
Background #EEE EF2
Primary    #004643
Secondary  #375B5A
Accent     #608584
```

정확한 HEX:

```css
--color-text: #050315;
--color-background: #EEEEF2;
--color-primary: #004643;
--color-secondary: #375B5A;
--color-accent: #608584;
```

## 10.1 Text

```text
#050315
```

주요 텍스트, 제목, 본문, 아이콘 등에 사용한다.

기본 텍스트 색상으로 사용한다.

---

## 10.2 Background

```text
#EEEEF2
```

전체 애플리케이션의 기본 배경색.

순백색(#FFFFFF)을 전체 배경으로 사용하는 것을 기본값으로 하지 않는다.

---

## 10.3 Primary

```text
#004643
```

StackBox의 핵심 브랜드 색상.

주요 CTA, 활성 상태, 핵심 인터랙션 등에 사용한다.

예:

* Primary Button
* Active navigation
* Selected state
* 주요 강조 요소
* 중요한 인터랙션

단, 화면 전체를 Primary 색상으로 채우지 않는다.

---

## 10.4 Secondary

```text
#375B5A
```

Primary보다 약한 강조가 필요한 영역에 사용한다.

예:

* Secondary Button
* 보조 UI
* Sub-navigation
* 상태 표시
* 강조된 정보 영역

---

## 10.5 Accent

```text
#608584
```

세부적인 강조나 interactive feedback에 사용한다.

예:

* Hover
* Focus
* Border highlight
* Selection
* Subtle emphasis

Accent를 대량으로 사용하지 않는다.

---

# 11. Color Usage Principle

색상은 장식보다 **정보의 hierarchy를 전달하기 위한 목적으로 사용한다.**

기본 원칙:

```text
Background
    ↓
Text
    ↓
Secondary
    ↓
Primary
    ↓
Accent
```

전체 UI가 컬러풀해지지 않도록 한다.

특히 Primary와 Accent를 모든 버튼에 적용하지 않는다.

---

# 12. Typography

Typography는 기능적인 UI와 Editorial한 문서 경험을 동시에 만족해야 한다.

제목과 본문의 hierarchy를 명확하게 만든다.

과도하게 많은 font size를 사용하지 않는다.

문서 영역에서는 UI보다 typography가 중요하다.

Code Block은 일반 문서와 명확하게 구분되어야 한다.

---

# 13. Border / Radius / Shadow

StackBox의 Brutalism을 유지하기 위해 다음을 기본 방향으로 한다.

### Border

명확한 영역 구분이 필요한 경우 border를 적극적으로 사용한다.

### Border Radius

과도한 `rounded-xl`, `rounded-2xl` 등의 사용을 피한다.

작고 제한적인 radius를 기본으로 한다.

모든 UI 요소를 pill 형태로 만들지 않는다.

### Shadow

장식적인 shadow를 최소화한다.

Layer hierarchy를 표현하는 데 실제로 필요한 경우에만 사용한다.

---

# 14. Animation

애니메이션은 장식이 아니라 상태 변화를 설명하기 위해 사용한다.

권장:

* Menu open/close
* Command Palette
* Block insertion
* Canvas interaction
* Panel expansion
* Contextual UI appearance

지양:

* 지속적인 floating animation
* 과도한 bouncing
* 의미 없는 transition
* 모든 요소에 동일한 animation 적용

Animation은 짧고 명확해야 한다.

---

# 15. Responsive Design

StackBox는 Desktop-first application이다.

Workspace, Canvas, Code execution 등의 기능을 고려하여 넓은 화면을 우선한다.

단, 일반 문서 및 Dashboard는 적절한 반응형 레이아웃을 제공한다.

모바일에서 Desktop Workspace를 억지로 축소하지 않는다.

---

# 16. Routes

## `/`

Landing Page

서비스를 소개하는 페이지.

목적:

* StackBox가 무엇인지 설명
* 핵심 기능 소개
* Workspace 경험 소개
* 회원가입 / 로그인 유도

Landing Page도 일반적인 SaaS 템플릿을 그대로 사용하지 않는다.

과도한 gradient hero, floating glass card, stock illustration 등을 지양한다.

StackBox의 실제 UI와 Workbench 경험을 보여주는 방향을 우선한다.

---

## `/dashboard`

사용자의 Workspace를 관리하는 Dashboard.

주요 기능:

* Workspace 목록
* 최근 작업
* Workspace 생성
* Workspace 삭제 / 관리
* GitHub 관련 정보
* 최근 문서

Dashboard는 단순한 카드 Grid가 되지 않도록 한다.

정보의 hierarchy를 명확하게 하고 작업을 빠르게 시작할 수 있도록 설계한다.

---

## `/login`

회원가입 및 로그인.

지원해야 하는 기능:

* 로그인
* 회원가입
* 로그아웃
* 인증 상태 관리

인증 화면은 최대한 단순하게 유지한다.

---

## `/setting`

사용자 설정.

### GitHub 연동

GitHub 계정을 연결할 수 있어야 한다.

GitHub 연동 상태를 명확하게 보여준다.

예:

```text
GitHub

Connected
username

[Disconnect]
```

연동되지 않은 경우:

```text
GitHub

Not connected

[Connect GitHub]
```

---

# 17. `/workspace/{params}`

StackBox의 핵심 화면.

Workspace 안에서 다음 기능을 제공한다.

## 17.1 Markdown Editor

Tiptap 기반의 Markdown/Document Editor.

핵심 원칙:

* 문서가 화면의 중심
* 최소한의 Toolbar
* Slash Command 적극 활용
* Contextual Toolbar
* Block 기반 구조
* Code Block과 다른 콘텐츠의 자연스러운 결합

Notion의 UI를 그대로 복제하지 않는다.

---

## 17.2 FigJam / Infinite Canvas

Canvas는 **tldraw** 기반으로 구현한다.

tldraw는 StackBox Canvas의 **최종 기술 결정**이다. Konva로 마이그레이션하지 않는다.

역할 분담:

```text
tldraw  →  rendering, shapes, selection, camera, interaction
Yjs     →  real-time collaboration (필요한 경우)
```

즉, Canvas의 렌더링과 인터랙션은 tldraw가 담당하고, 협업 동기화가 필요한 시점에 Yjs를 결합한다.

단, tldraw를 사용한다는 것이 tldraw의 기본 UI를 그대로 노출한다는 의미는 아니다.

tldraw의 rendering / interaction engine은 활용하되, Canvas의 시각 언어는 StackBox의 색상 체계와 Brutalism 원칙을 따른다.

Canvas 기능:

* Text
* Shape
* Connector
* Image
* Sticky Note
* Selection
* Multi-selection
* Zoom
* Pan
* Collaboration

Canvas 역시 FigJam의 UI를 그대로 복제하지 않는다.

StackBox의 Document와 자연스럽게 연결될 수 있어야 한다.

---

## 17.3 Code Block

문서 안에서 코드를 작성하고 실행할 수 있는 Code Block.

예:

```text
┌─────────────────────────────┐
│ Python                Run ▶ │
├─────────────────────────────┤
│ print("Hello StackBox")     │
│                             │
├─────────────────────────────┤
│ Output                      │
│ Hello StackBox              │
└─────────────────────────────┘
```

기본 상태에서는 최소한의 UI만 보여준다.

실행 환경, 패키지, 입력, 출력, 터미널 등의 고급 기능은 Progressive Disclosure 방식으로 공개한다.

---

# 18. AI PPT Generation

AI PPT 생성은 별도의 독립적인 앱처럼 만들지 않는다.

문서의 콘텐츠에서 자연스럽게 PPT를 생성할 수 있어야 한다.

예:

```text
Document
    ↓
AI
    ↓
Generate Presentation
    ↓
Slides
```

사용자가 작성한 콘텐츠를 선택하고:

```text
Create a presentation from this
```

와 같은 작업을 수행할 수 있어야 한다.

AI 기능은 StackBox의 Workspace 안에 자연스럽게 녹아들어야 한다.

---

# 19. What NOT to Do

다음과 같은 UI는 특별한 이유가 없는 한 만들지 않는다.

### Notion Clone UI

```text
Sidebar
├── Home
├── Favorites
├── Private
└── Shared

        Page
        ├── Title
        └── Blocks
```

### Generic SaaS UI

```text
┌───────────────────────────────┐
│ Logo      Features Pricing    │
├───────────────────────────────┤
│                               │
│     Build better together     │
│                               │
│       [ Get Started ]         │
│                               │
└───────────────────────────────┘
```

### Generic AI UI

```text
✨ AI Assistant

What do you want to create?

[ Generate ]
```

### 과도한 Card UI

모든 요소를 Card로 감싸지 않는다.

### 과도한 Rounded UI

모든 요소를 `rounded-xl`로 만들지 않는다.

---

# 20. Core UX Statement

StackBox의 UX는 다음 문장을 만족해야 한다.

> **"처음에는 단순하고, 사용할수록 강력해진다."**

사용자는 처음 StackBox를 열었을 때 복잡한 기능 목록을 볼 필요가 없다.

하지만 `/`, `⌘K`, Context Menu, Hover, Selection 등의 인터랙션을 통해 점점 더 많은 기능을 발견할 수 있어야 한다.

---

# 21. Final Design Rule

구현 중 디자인 결정이 애매할 경우 다음 순서로 판단한다.

1. 사용자의 콘텐츠가 중심인가?
2. 현재 작업에 필요한 UI만 보여주고 있는가?
3. 기능을 단계적으로 공개할 수 있는가?
4. Notion/AFFiNE/FigJam의 기존 UI를 단순 복제하고 있지는 않은가?
5. 불필요한 장식이 없는가?
6. Desktop Workspace에서 자연스러운가?
7. StackBox만의 UI라고 느껴지는가?

**StackBox는 "기능이 많은 앱"이 아니라 "복잡한 작업을 단순한 인터페이스로 수행하는 Workspace"여야 한다.**

> **Simple on the surface. Powerful underneath.**
# 22. Anti-AI-Slop Design Rules

StackBox는 AI가 생성한 것처럼 보이는 흔한 SaaS 디자인을 의도적으로 피한다.

목표는 "AI로 만든 예쁜 웹사이트"가 아니라 **명확한 디자인 의도를 가진 실제 제품**처럼 보이는 것이다.

---

## 22.1 금지되는 AI Slop 패턴

다음 패턴은 특별한 이유가 없는 한 사용하지 않는다.

### Generic AI Hero

```text
✨ AI-powered workspace for the future

Create. Collaborate. Innovate.

[Get Started]
```

이와 같은 추상적이고 의미 없는 마케팅 문구를 사용하지 않는다.

StackBox의 실제 기능과 사용 경험을 보여준다.

---

### Excessive Gradient

다음과 같은 패턴을 지양한다.

```text
purple → blue → pink
blue → violet
orange → pink
```

특히 Hero 영역 전체에 거대한 gradient를 사용하는 것을 금지한다.

StackBox의 primary color를 중심으로 제한적인 색상 체계를 유지한다.

---

### Glassmorphism Everywhere

다음 패턴을 기본 UI로 사용하지 않는다.

```text
backdrop-blur
bg-white/10
border-white/20
shadow-xl
rounded-2xl
```

Glass 효과를 제품의 기본 디자인 언어로 사용하지 않는다.

---

### Excessive Rounded Cards

모든 UI를 다음과 같이 만드는 것을 피한다.

```text
rounded-xl
rounded-2xl
rounded-3xl
```

특히 다음과 같은 구조를 반복하지 않는다.

```text
┌────────────────────────────┐
│                            │
│       Icon                 │
│                            │
│       Feature Title        │
│                            │
│       Description          │
│                            │
└────────────────────────────┘
```

아이콘 + 제목 + 설명 + 둥근 카드의 반복은 전형적인 AI-generated SaaS 패턴으로 간주한다.

---

## 22.2 AI Slop Copywriting 금지

UI 텍스트도 AI Slop을 피한다.

다음과 같은 표현을 남발하지 않는다.

* "Unlock your potential"
* "Empower your workflow"
* "Supercharge your productivity"
* "The future of..."
* "All-in-one platform"
* "Seamless collaboration"
* "Powerful yet simple"
* "Built for the modern..."
* "Take your workflow to the next level"

이런 문구 대신 **실제 기능을 직접 설명한다.**

예:

### Bad

```text
Unlock your team's creativity.
```

### Good

```text
Write, draw, and run code in one workspace.
```

---

# 23. No Decorative AI

AI를 나타내기 위해 다음 요소를 무조건 사용하지 않는다.

* ✨ Sparkle icon
* Magic wand
* Purple glow
* Gradient orb
* Floating AI brain
* Robot illustration
* "AI Magic" 버튼
* 반짝이는 애니메이션

AI는 별도의 마법 같은 존재가 아니다.

StackBox에서 AI는 **사용자의 작업을 수행하는 하나의 도구**다.

예:

```text id="q5j3bk"
Select text
      ↓
Generate presentation
```

또는:

```text id="p8pl9k"
/
→ AI
→ Generate slides
```

처럼 실제 작업 흐름에 포함시킨다.

---

# 24. No Fake Complexity

제품이 고급스러워 보이기 위해 불필요한 UI를 만들지 않는다.

금지:

```text id="4b8j7k"
Dashboard
├── Analytics
├── Productivity Score
├── AI Insights
├── Activity
├── Recent
├── Recommendations
├── Trends
└── Quick Actions
```

실제로 필요한 기능만 보여준다.

**빈 공간을 채우기 위해 UI를 추가하지 않는다.**

---

# 25. No Dashboard Theater

Dashboard를 실제 작업보다 "제품이 복잡해 보이게 만드는 화면"으로 만들지 않는다.

Dashboard의 목적은:

> **사용자가 작업을 빠르게 다시 시작하는 것**

이다.

따라서 다음을 남발하지 않는다.

* 가짜 통계
* 의미 없는 그래프
* Productivity Score
* AI-generated recommendations
* 장식용 activity chart
* 의미 없는 숫자 카드

사용자의 실제 Workspace와 작업물을 우선한다.

---

# 26. No Dribbblification

StackBox는 Dribbble / Behance용 컨셉 디자인처럼 보이는 것을 목표로 하지 않는다.

예쁜 화면보다 **실제로 사용할 수 있는 인터페이스**를 우선한다.

특히 다음을 경계한다.

* 지나치게 큰 Hero
* 지나치게 큰 typography
* 화면 대부분을 차지하는 빈 공간
* 기능보다 장식이 많은 UI
* 실제 제품에서는 불편한 interaction
* mockup을 위한 mockup

---

# 27. No Unnecessary Icons

모든 기능에 아이콘을 붙이지 않는다.

아이콘은 의미 전달이 실제로 개선되는 경우에만 사용한다.

다음과 같은 패턴을 피한다.

```text id="n7w2hl"
📝 Documents
🎨 Canvas
💻 Code
🤖 AI
📊 Slides
⚙️ Settings
```

이모지를 UI의 주요 navigation system으로 사용하지 않는다.

아이콘보다 typography와 layout으로 hierarchy를 표현한다.

---

# 28. No Excessive Micro-interactions

모든 버튼과 카드에 animation을 추가하지 않는다.

다음과 같은 패턴을 피한다.

```text
hover → scale
hover → glow
hover → rotate
click → bounce
scroll → parallax
```

Animation은 사용자의 상태 변화를 이해시키는 경우에만 사용한다.

---

# 29. No AI-generated Layout Patterns

다음과 같은 반복적인 레이아웃을 경계한다.

```text
Hero
↓
3 Feature Cards
↓
Large Screenshot
↓
3 More Cards
↓
Testimonials
↓
Pricing
↓
CTA
```

또는:

```text
icon
title
description
button
```

의 반복.

레이아웃은 실제 정보 구조와 사용자 행동을 기준으로 결정한다.

---

# 30. Intentional Imperfection

StackBox의 Brutalism은 완벽하게 매끈한 디자인을 목표로 하지 않는다.

필요하다면 다음과 같은 특징을 사용할 수 있다.

* 명확한 border
* 예상보다 강한 typography
* 약간 거친 hierarchy
* 비대칭 layout
* 충분한 여백 대신 의도적인 밀도
* 직선적인 UI
* raw한 interaction

단, "거칠게 보이기 위한 거침"은 금지한다.

모든 불완전함에는 명확한 디자인 목적이 있어야 한다.

---

# 31. Real Product > Marketing Mockup

모든 화면은 실제 사용 가능한 제품이라는 전제에서 설계한다.

다음 질문을 항상 고려한다.

> 이 UI가 실제로 매일 사용된다면 편한가?

> 이 요소가 없어도 된다면 왜 존재하는가?

> 이 기능을 더 단순하게 표현할 수 있는가?

> 이 UI가 AI가 만든 랜딩페이지처럼 보이지 않는가?

---

# 32. Design Anti-Checklist

새로운 UI를 만들 때 다음 조건을 확인한다.

* [ ] Gradient를 장식 목적으로 사용하지 않았는가?
* [ ] 모든 요소를 둥근 카드로 만들지 않았는가?
* [ ] 의미 없는 아이콘을 추가하지 않았는가?
* [ ] "AI", "Magic", "✨"를 불필요하게 강조하지 않았는가?
* [ ] 추상적인 마케팅 문구를 사용하지 않았는가?
* [ ] 실제 기능보다 장식이 앞서지 않는가?
* [ ] Dashboard에 의미 없는 통계가 들어가지 않았는가?
* [ ] 빈 공간을 채우려고 UI를 추가하지 않았는가?
* [ ] 모든 요소에 애니메이션을 넣지 않았는가?
* [ ] Notion/AFFiNE/FigJam을 그대로 복제하지 않았는가?
* [ ] AI가 생성한 일반적인 SaaS 템플릿처럼 보이지 않는가?
* [ ] 이 요소를 제거했을 때 UX가 나빠지는가?

마지막 질문에 **"아니오"**라면 해당 요소를 제거한다.

---

# 33. Core Principle

StackBox의 디자인은 다음 우선순위를 따른다.

```text id="zj3r8x"
Function
   ↓
Information
   ↓
Interaction
   ↓
Aesthetics
```

예쁜 UI를 만들기 위해 기능을 희생하지 않는다.

**디자인은 장식이 아니라 사용자의 작업을 명확하게 만드는 도구다.**

StackBox는 AI가 만든 것처럼 보이는 제품이 아니라,

> **사람이 명확한 의도를 가지고 설계한 도구**

처럼 보여야 한다.
