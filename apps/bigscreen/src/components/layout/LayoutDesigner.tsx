import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Save, Eye, Edit3, Plus, Trash2 } from "lucide-react";
import { twMerge } from "tailwind-merge";
import {
  LayoutSelector,
} from "./LayoutSelector";
import { LayoutConfig, LayoutArea, useLayoutStore } from "../../stores/useLayoutStore";
import { ComponentSelector, ComponentOption } from "./ComponentSelector";
import { CustomLayoutEditor } from "./CustomLayoutEditor";
import { renderComponent } from "./LayoutComponentProvider";
import { useToast } from "../ui/Toast";

interface LayoutDesignerProps {
  onSave?: (layout: LayoutConfig) => void;
  onCancel?: () => void;
  initialLayout?: LayoutConfig | null;
  className?: string;
}

export const LayoutDesigner: React.FC<LayoutDesignerProps> = ({
  onSave,
  onCancel,
  initialLayout,
  className,
}) => {
  const { saveLayout: saveToLayoutStore } = useLayoutStore();
  const { success, error } = useToast();
  const [currentStep, setCurrentStep] = useState<
    "layout" | "design" | "configure" | "custom"
  >("layout");
  const [selectedLayout, setSelectedLayout] =
    useState<LayoutConfig | null>(
      initialLayout || null
    );
  const [layoutAreas, setLayoutAreas] = useState<LayoutArea[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [selectedArea] = useState<string | null>(null);
  const [showComponentSelector, setShowComponentSelector] = useState(false);
  const [currentArea, setCurrentArea] = useState<LayoutArea | null>(null);

  // 选择布局后进入设计步骤
  const handleLayoutSelect = useCallback((layout: LayoutConfig) => {
    setSelectedLayout(layout);
    const areas = layout.areas || layout.items?.map(item => ({
      id: item.id,
      name: typeof item.component === 'string' ? item.component : item.component.name,
      title: typeof item.component === 'string' ? item.component : item.component.name,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      component: typeof item.component === 'string' ? item.component : null,
      props: item.props
    })) || [];
    setLayoutAreas(areas);
    setCurrentStep("design");
  }, []);

  // 创建新布局
  const handleCreateCustom = useCallback(() => {
    setCurrentStep("custom");
  }, []);

  // 新布局保存
  const handleCustomLayoutSave = useCallback(
    (
      areas: LayoutArea[],
      config: { cols: number; name: string; description: string }
    ) => {
      try {
        const layoutConfig: LayoutConfig = {
          id: "layout-" + Date.now(),
          name: config.name,
          description: config.description,
          items: areas.map((area) => ({
            id: area.id,
            x: area.x,
            y: area.y,
            w: area.w,
            h: area.h,
            component: area.component || 'EmptyWidget',
            props: area.props || {}
          })),
          cols: config.cols,
          rowHeight: 100,
          gap: 16,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          areas,
          thumbnail: "🎨",
          category: "custom"
        };
        
        saveToLayoutStore(layoutConfig);
        success('布局保存成功', `新布局 "${config.name}" 已成功保存！`);

        setSelectedLayout(layoutConfig);
        setLayoutAreas(areas);
        setCurrentStep("design");
      } catch (err) {
        error('保存失败', '保存布局失败：' + (err as Error).message);
      }
    },
    [saveToLayoutStore]
  );

  // 为区域选择组件
  const handleAreaClick = useCallback(
    (area: LayoutArea) => {
      if (!isPreviewMode) {
        setCurrentArea(area);
        setShowComponentSelector(true);
      }
    },
    [isPreviewMode]
  );

  // 组件选择完成
  const handleComponentSelect = useCallback(
    (component: ComponentOption) => {
      if (currentArea) {
        setLayoutAreas((prev) =>
          prev.map((area) =>
            area.id === currentArea.id
              ? { ...area, component: component.id, placeholder: undefined }
              : area
          )
        );
        setShowComponentSelector(false);
        setCurrentArea(null);
      }
    },
    [currentArea]
  );

  // 删除区域中的组件
  const handleRemoveComponent = useCallback((areaId: string) => {
    setLayoutAreas((prev) =>
      prev.map((area) =>
        area.id === areaId
          ? {
              ...area,
              component: null,
              placeholder: area.placeholder || "选择组件",
            }
          : area
      )
    );
  }, []);

  // 保存布局
  const handleSave = useCallback(() => {
    if (selectedLayout) {
      try {
        const updatedLayout: LayoutConfig = {
          ...selectedLayout,
          items: layoutAreas.map((area) => ({
            id: area.id,
            x: area.x,
            y: area.y,
            w: area.w,
            h: area.h,
            component: area.component || 'EmptyWidget',
            props: area.props || {}
          })),
          areas: layoutAreas,
          updatedAt: new Date().toISOString()
        };
        
        saveToLayoutStore(updatedLayout);
        success('布局保存成功', `布局 "${updatedLayout.name}" 已成功保存！`);

        // 如果有外部回调，也调用它
        if (onSave) {
          onSave(updatedLayout);
        }
      } catch (err) {
        error('保存失败', '保存布局失败：' + (err as Error).message);
      }
    }
  }, [selectedLayout, layoutAreas, onSave, saveToLayoutStore]);

  // 渲染布局预览
  const renderLayoutPreview = () => {
    if (!selectedLayout) return null;

    return (
      <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
        <div
          className="grid gap-2 p-4 min-h-[500px]"
          style={{
            gridTemplateColumns: `repeat(${selectedLayout.cols}, 1fr)`,
            gridTemplateRows: "repeat(20, 30px)",
          }}
        >
          {layoutAreas.map((area) => (
            <motion.div
              key={area.id}
              className={twMerge(
                "border-2 border-dashed relative rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all duration-200 p-2",
                area.component
                  ? "border-blue-300 bg-blue-50 hover:bg-blue-100"
                  : "border-gray-300 bg-gray-50 hover:bg-gray-100",
                selectedArea === area.id && "ring-2 ring-blue-400",
                isPreviewMode && "cursor-default"
              )}
              style={{
                gridColumn: `${area.x + 1} / ${area.x + area.w + 1}`,
                gridRow: `${area.y + 1} / ${area.y + area.h + 1}`,
              }}
              onClick={() => handleAreaClick(area)}
            >
              {area.component ? (
                <div className="flex-1 overflow-hidden absolute top-0 bottom-0 left-0 right-0 p-1">
                  {/* 真实组件渲染 */}
                  {renderComponent(area.component)}
                  {/* 组件操作按钮 */}
                  {!isPreviewMode && (
                    <div className="absolute top-2 right-2 flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveComponent(area.id);
                        }}
                        className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors shadow-sm"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <Plus className="w-6 h-6 text-gray-400 mb-1" />
                  <div className="text-xs text-gray-500">
                    {area.placeholder || "点击选择组件"}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {area.w}×{area.h}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={twMerge("h-full flex flex-col", className)}>
      {/* 步骤指示器 */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center space-x-4">
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          )}

          <div className="flex items-center space-x-2">
            <div
              className={twMerge(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                currentStep === "layout"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-600"
              )}
            >
              1
            </div>
            <span className="text-sm font-medium">选择布局</span>
          </div>

          <div className="w-8 h-0.5 bg-gray-300"></div>

          <div className="flex items-center space-x-2">
            <div
              className={twMerge(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                currentStep === "design" || currentStep === "custom"
                  ? "bg-blue-600 text-white"
                  : currentStep === "configure"
                  ? "bg-green-600 text-white"
                  : "bg-gray-200 text-gray-600"
              )}
            >
              2
            </div>
            <span className="text-sm font-medium">
              {currentStep === "custom" ? "新建布局" : "编辑布局"}
            </span>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {/* 步骤1: 选择布局 */}
          {currentStep === "layout" && (
            <motion.div
              key="layout-step"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full overflow-y-auto p-6"
            >
              <LayoutSelector
                onSelectLayout={handleLayoutSelect}
                onCreateCustom={handleCreateCustom}
              />
            </motion.div>
          )}

          {/* 步骤2: 设计配置 */}
          {currentStep === "design" && selectedLayout && (
            <motion.div
              key="design-step"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full flex flex-col"
            >
              {/* 工具栏 */}
              <div className="bg-white border-b px-6 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">
                      {selectedLayout.name}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {selectedLayout.description}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setIsPreviewMode(!isPreviewMode)}
                      className={twMerge(
                        "flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors",
                        isPreviewMode
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      )}
                    >
                      {isPreviewMode ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <Edit3 className="w-4 h-4" />
                      )}
                      <span>{isPreviewMode ? "预览" : "编辑"}</span>
                    </button>

                    <button
                      onClick={() => setCurrentStep("custom")}
                      className="flex items-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>修改布局结构</span>
                    </button>

                    <button
                      onClick={handleSave}
                      className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      <span>保存布局</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 布局画布 */}
              <div className="flex-1 p-6 bg-gray-50 overflow-auto">
                {renderLayoutPreview()}
              </div>
            </motion.div>
          )}

          {/* 步骤: 新建/编辑布局 */}
          {currentStep === "custom" && (
            <motion.div
              key="custom-step"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full"
            >
              <CustomLayoutEditor
                initialAreas={layoutAreas}
                cols={selectedLayout?.cols || 12}
                initialName={selectedLayout?.name || "新布局"}
                initialDescription={
                  selectedLayout?.description || "用户创建的布局"
                }
                onSave={handleCustomLayoutSave}
                onCancel={() =>
                  setCurrentStep(selectedLayout ? "design" : "layout")
                }
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 组件选择器 */}
      <ComponentSelector
        isOpen={showComponentSelector}
        onClose={() => {
          setShowComponentSelector(false);
          setCurrentArea(null);
        }}
        onSelect={handleComponentSelect}
        areaSize={
          currentArea ? { w: currentArea.w, h: currentArea.h } : undefined
        }
        areaType={currentArea?.type}
        allowedComponents={currentArea?.allowedComponents}
        currentComponent={currentArea?.component}
      />
    </div>
  );
};
