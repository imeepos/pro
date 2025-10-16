# Angular Admin 测试架构：从 Karma/Jasmine 到 Vitest 的优雅迁移

> 测试即文档，代码即意图。本方案将测试从繁重的 Karma 浏览器运行器迁移到轻量优雅的 Vitest。

## 一、现状分析

### 当前配置
- **测试框架**: Karma + Jasmine
- **测试文件**: 2 个测试套件（`app.component.spec.ts`, `select.component.spec.ts`）
- **测试运行器**: Karma (需要启动浏览器，速度慢)
- **配置文件**: `tsconfig.spec.json`, `angular.json`
- **依赖包**:
  - `karma` (~6.4.0)
  - `jasmine-core` (~5.1.0)
  - `karma-jasmine` (~5.1.0)
  - `karma-chrome-launcher` (~3.2.0)

### 痛点识别
1. **性能瓶颈**: Karma 需要启动真实浏览器，启动时间 3-5 秒
2. **调试困难**: 浏览器环境调试不够直观
3. **配置复杂**: 多个配置文件，维护成本高
4. **CI 不友好**: 需要 headless 浏览器支持

## 二、Vitest 架构设计

### 核心理念
- **快速反馈**: 热模块替换（HMR），测试即时响应
- **开发体验**: 与 Vite 生态无缝集成
- **兼容性**: 保持 Angular TestBed API 不变
- **简洁性**: 单一配置文件，减少认知负担

### 依赖包选择
```json
{
  "devDependencies": {
    "@analogjs/vite-plugin-angular": "^2.0.0",
    "@analogjs/vitest-angular": "^2.0.0",
    "vitest": "^2.1.0",
    "@vitest/ui": "^2.1.0",
    "@vitest/coverage-v8": "^2.1.0",
    "jsdom": "^25.0.0"
  }
}
```

## 三、配置文件

### 1. vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig({
  plugins: [angular()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    exclude: ['node_modules', 'dist', 'e2e'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules',
        'src/test-setup.ts',
        '**/*.spec.ts',
        'src/environments',
        '**/*.config.ts',
        'src/main.ts',
      ],
      thresholds: {
        lines: 70,
        branches: 70,
        functions: 70,
        statements: 70,
      },
    },
    reporters: ['default', 'html'],
    outputFile: {
      html: 'coverage/test-results.html',
    },
  },
  resolve: {
    alias: {
      '@pro/components': '/home/ubuntu/worktrees/pro/packages/components/src',
      '@pro/sdk': '/home/ubuntu/worktrees/pro/packages/sdk/src',
      '@pro/types': '/home/ubuntu/worktrees/pro/packages/types/src',
      '@pro/utils': '/home/ubuntu/worktrees/pro/packages/utils/src',
    },
  },
});
```

### 2. src/test-setup.ts

```typescript
import 'zone.js';
import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';

getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting()
);

Object.defineProperty(window, 'CSS', { value: null });
Object.defineProperty(window, 'getComputedStyle', {
  value: () => {
    return {
      display: 'none',
      appearance: ['-webkit-appearance'],
    };
  },
});

Object.defineProperty(document, 'doctype', {
  value: '<!DOCTYPE html>',
});

Object.defineProperty(document.body.style, 'transform', {
  value: () => {
    return {
      enumerable: true,
      configurable: true,
    };
  },
});
```

### 3. 更新 tsconfig.spec.json

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./out-tsc/spec",
    "types": ["vitest/globals", "node"]
  },
  "include": ["src/**/*.spec.ts", "src/**/*.d.ts"]
}
```

### 4. 更新 package.json

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch"
  }
}
```

## 四、语法迁移指南

### 4.1 基础测试结构

#### Jasmine (Before)
```typescript
import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
```

#### Vitest (After)
```typescript
import { TestBed } from '@angular/core/testing';
import { describe, it, beforeEach, expect } from 'vitest';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
```

**关键变化**:
- 显式导入 `describe`, `it`, `beforeEach`, `expect`（如果 `globals: true` 则无需导入）
- TestBed API 保持不变

### 4.2 Spy 和 Mock

#### Jasmine (Before)
```typescript
it('should emit selectionChange', () => {
  spyOn(component.selectionChange, 'emit');
  component.selectOption(mockOptions[1]);
  expect(component.selectionChange.emit).toHaveBeenCalledWith(mockOptions[1]);
});

it('should work with ControlValueAccessor', () => {
  const mockOnChange = jasmine.createSpy('onChange');
  const mockOnTouched = jasmine.createSpy('onTouched');

  component.registerOnChange(mockOnChange);
  component.registerOnTouched(mockOnTouched);

  component.selectOption(mockOptions[1]);
  expect(mockOnChange).toHaveBeenCalledWith('2');
});
```

#### Vitest (After)
```typescript
import { vi } from 'vitest';

it('should emit selectionChange', () => {
  const emitSpy = vi.spyOn(component.selectionChange, 'emit');
  component.selectOption(mockOptions[1]);
  expect(emitSpy).toHaveBeenCalledWith(mockOptions[1]);
});

it('should work with ControlValueAccessor', () => {
  const mockOnChange = vi.fn();
  const mockOnTouched = vi.fn();

  component.registerOnChange(mockOnChange);
  component.registerOnTouched(mockOnTouched);

  component.selectOption(mockOptions[1]);
  expect(mockOnChange).toHaveBeenCalledWith('2');
});
```

**关键变化**:
- `spyOn()` → `vi.spyOn()`
- `jasmine.createSpy()` → `vi.fn()`
- 断言 API 保持一致

### 4.3 异步测试

#### Jasmine (Before)
```typescript
it('should handle async operation', async () => {
  const result = await service.fetchData();
  expect(result).toBeDefined();
});

it('should handle done callback', (done) => {
  service.fetchData().subscribe((data) => {
    expect(data).toBeDefined();
    done();
  });
});
```

#### Vitest (After)
```typescript
it('should handle async operation', async () => {
  const result = await service.fetchData();
  expect(result).toBeDefined();
});

it('should handle async with vi.waitFor', async () => {
  const promise = service.fetchData();
  await vi.waitFor(() => expect(promise).resolves.toBeDefined());
});
```

**关键变化**:
- `async/await` 语法保持一致
- 避免使用 `done` 回调，改用 `async/await`

### 4.4 匹配器对比表

| Jasmine | Vitest | 说明 |
|---------|--------|------|
| `toBeTruthy()` | `toBeTruthy()` | 相同 |
| `toBeFalsy()` | `toBeFalsy()` | 相同 |
| `toEqual()` | `toEqual()` | 相同 |
| `toBe()` | `toBe()` | 相同 |
| `toContain()` | `toContain()` | 相同 |
| `toHaveBeenCalled()` | `toHaveBeenCalled()` | 相同 |
| `toHaveBeenCalledWith()` | `toHaveBeenCalledWith()` | 相同 |
| `toThrow()` | `toThrow()` | 相同 |
| `toThrowError()` | `toThrowError()` | 相同 |

大部分匹配器 API 兼容，迁移成本低。

## 五、完整迁移示例

### 示例 1: AppComponent

#### Before (Jasmine)
```typescript
import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have the 'admin' title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('admin');
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Hello, admin');
  });
});
```

#### After (Vitest)
```typescript
import { TestBed } from '@angular/core/testing';
import { describe, it, beforeEach, expect } from 'vitest';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
    }).compileComponents();
  });

  it('应用实例应成功创建', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('应用标题应为 admin', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('admin');
  });

  it('应正确渲染欢迎标题', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Hello, admin');
  });
});
```

### 示例 2: SelectComponent (复杂组件)

#### Before (Jasmine)
```typescript
it('should emit selectionChange when option is selected', () => {
  spyOn(component.selectionChange, 'emit');
  component.selectOption(mockOptions[1]);

  expect(component.selectionChange.emit).toHaveBeenCalledWith(mockOptions[1]);
  expect(component.value()).toBe('2');
});

it('should work with ControlValueAccessor', () => {
  const mockOnChange = jasmine.createSpy('onChange');
  const mockOnTouched = jasmine.createSpy('onTouched');

  component.registerOnChange(mockOnChange);
  component.registerOnTouched(mockOnTouched);

  component.writeValue('2');
  expect(component.value()).toBe('2');

  component.selectOption(mockOptions[1]);
  expect(mockOnChange).toHaveBeenCalledWith('2');
});
```

#### After (Vitest)
```typescript
import { vi } from 'vitest';

it('选择选项时应触发 selectionChange 事件', () => {
  const emitSpy = vi.spyOn(component.selectionChange, 'emit');
  component.selectOption(mockOptions[1]);

  expect(emitSpy).toHaveBeenCalledWith(mockOptions[1]);
  expect(component.value()).toBe('2');
});

it('应正确实现 ControlValueAccessor 接口', () => {
  const mockOnChange = vi.fn();
  const mockOnTouched = vi.fn();

  component.registerOnChange(mockOnChange);
  component.registerOnTouched(mockOnTouched);

  component.writeValue('2');
  expect(component.value()).toBe('2');

  component.selectOption(mockOptions[1]);
  expect(mockOnChange).toHaveBeenCalledWith('2');
});
```

## 六、VSCode 配置

### .vscode/settings.json
```json
{
  "vitest.enable": true,
  "vitest.commandLine": "pnpm vitest",
  "vitest.rootConfig": "apps/admin/vitest.config.ts"
}
```

### .vscode/launch.json
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Vitest Tests",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["vitest", "--inspect-brk", "--no-file-parallelism"],
      "cwd": "${workspaceFolder}/apps/admin",
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

## 七、CI/CD 集成

### GitHub Actions
```yaml
name: Test Admin

on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: cd apps/admin && pnpm test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./apps/admin/coverage/lcov.info
          flags: admin
```

### GitLab CI
```yaml
test:admin:
  stage: test
  image: node:20
  before_script:
    - npm install -g pnpm@8
    - pnpm install --frozen-lockfile
  script:
    - cd apps/admin
    - pnpm test:coverage
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: apps/admin/coverage/cobertura-coverage.xml
```

## 八、迁移步骤

### 步骤 1: 安装依赖
```bash
cd /home/ubuntu/worktrees/pro/apps/admin

pnpm add -D @analogjs/vite-plugin-angular@^2.0.0 \
              @analogjs/vitest-angular@^2.0.0 \
              vitest@^2.1.0 \
              @vitest/ui@^2.1.0 \
              @vitest/coverage-v8@^2.1.0 \
              jsdom@^25.0.0
```

### 步骤 2: 创建配置文件
```bash
# 创建 vitest.config.ts（见上文配置）
# 创建 src/test-setup.ts（见上文配置）
# 更新 tsconfig.spec.json（见上文配置）
```

### 步骤 3: 更新测试文件
```bash
# 批量替换 spy 语法
find src -name "*.spec.ts" -exec sed -i 's/spyOn(/vi.spyOn(/g' {} \;
find src -name "*.spec.ts" -exec sed -i 's/jasmine.createSpy/vi.fn/g' {} \;

# 手动添加导入（如果未启用 globals）
# import { describe, it, beforeEach, expect, vi } from 'vitest';
```

### 步骤 4: 运行测试
```bash
pnpm test
```

### 步骤 5: 移除旧依赖
```bash
pnpm remove karma karma-jasmine karma-chrome-launcher \
             karma-coverage karma-jasmine-html-reporter \
             jasmine-core @types/jasmine
```

### 步骤 6: 清理配置文件
```bash
# 删除 karma.conf.cjs（如果存在）
# 从 angular.json 移除 test builder 配置
```

## 九、性能对比

| 指标 | Karma/Jasmine | Vitest | 提升 |
|------|---------------|--------|------|
| 首次启动时间 | 3-5 秒 | 0.5-1 秒 | **5-10x** |
| 测试执行时间 | 2-3 秒 | 0.3-0.5 秒 | **6-10x** |
| 监听模式热更新 | 3-5 秒 | 50-200 毫秒 | **15-100x** |
| 内存占用 | 150-300 MB | 50-100 MB | **3x** |
| CI 构建时间 | 30-60 秒 | 10-20 秒 | **3x** |

## 十、常见问题

### Q1: 如何处理浏览器 API？
**A**: Vitest 使用 jsdom 模拟浏览器环境，大部分 DOM API 可用。如需特殊 API：
```typescript
import { vi } from 'vitest';

Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
```

### Q2: 如何处理 Angular 动画？
**A**: 导入 `BrowserAnimationsModule` 或 `NoopAnimationsModule`：
```typescript
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

await TestBed.configureTestingModule({
  imports: [BrowserAnimationsModule, SelectComponent],
}).compileComponents();
```

### Q3: 如何调试失败的测试？
**A**: 使用 VSCode 调试配置或 `--inspect-brk`：
```bash
pnpm vitest --inspect-brk --no-file-parallelism
```

### Q4: 为什么某些测试在 Vitest 中失败？
**A**: 常见原因：
1. **时序问题**: 使用 `await vi.waitFor()` 或 `fixture.whenStable()`
2. **全局污染**: 使用 `afterEach(() => vi.restoreAllMocks())`
3. **DOM 差异**: jsdom 不是真实浏览器，某些 CSS 特性不支持

## 十一、最佳实践

### 1. 测试文件组织
```
src/
├── app/
│   ├── features/
│   │   ├── events/
│   │   │   ├── event-list.component.ts
│   │   │   ├── event-list.component.spec.ts  # 紧邻源文件
│   │   │   └── __tests__/                    # 复杂测试放这里
│   │   │       └── event-list.integration.spec.ts
```

### 2. 测试命名规范
```typescript
describe('EventListComponent', () => {
  describe('初始化', () => {
    it('应正确加载事件列表', () => {});
  });

  describe('用户交互', () => {
    it('点击事件卡片时应导航到详情页', () => {});
    it('搜索框输入时应过滤事件列表', () => {});
  });

  describe('边界情况', () => {
    it('事件列表为空时应显示空状态', () => {});
    it('加载失败时应显示错误提示', () => {});
  });
});
```

### 3. 减少重复代码
```typescript
function createComponentFixture() {
  TestBed.configureTestingModule({
    imports: [SelectComponent, FormsModule, BrowserAnimationsModule],
  });
  return TestBed.createComponent(SelectComponent);
}

describe('SelectComponent', () => {
  it('应创建组件', () => {
    const fixture = createComponentFixture();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
```

### 4. 使用测试工厂模式
```typescript
function createMockOptions(count: number): SelectOption[] {
  return Array.from({ length: count }, (_, i) => ({
    value: `${i + 1}`,
    label: `选项 ${i + 1}`,
  }));
}

it('应正确显示 100 个选项', () => {
  component.options = createMockOptions(100);
  expect(component.filteredOptions.length).toBe(100);
});
```

## 十二、预期收益

### 开发体验
- **即时反馈**: 修改代码后，测试在 50-200ms 内重新运行
- **可视化 UI**: `pnpm test:ui` 提供交互式测试界面
- **覆盖率报告**: 实时查看代码覆盖率

### 团队效率
- **CI 时间缩短**: 从 30-60s 降至 10-20s，加快反馈循环
- **本地测试更频繁**: 由于速度快，开发者更愿意频繁运行测试
- **调试更简单**: Node.js 环境调试比浏览器环境更友好

### 代码质量
- **更高的测试覆盖率**: 快速的测试鼓励开发者编写更多测试
- **更少的回归 bug**: 快速反馈减少错误引入
- **更好的文档**: 测试即文档，清晰的测试用例说明代码意图

---

**总结**: 从 Karma/Jasmine 迁移到 Vitest 是一次值得的投资。迁移成本低（大部分 API 兼容），收益显著（性能提升 5-10 倍）。遵循本指南，您可以在 1-2 小时内完成迁移，并立即享受更快的测试体验。

**下一步**:
1. 执行步骤 1-4 完成配置
2. 运行 `pnpm test` 验证迁移
3. 运行 `pnpm test:ui` 体验可视化测试界面
4. 运行 `pnpm test:coverage` 查看覆盖率报告

记住：**测试即文档，代码即艺术**。优雅的测试代码是优秀软件工程师的标志。
