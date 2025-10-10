import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CanvasService } from '../services/canvas.service';
import { CanvasQuery } from '../services/canvas.query';
import { RESOLUTION_PRESETS, BackgroundStyle, GradientStyle } from '../../models/canvas.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-canvas-config-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './canvas-config-panel.component.html',
  styleUrls: ['./canvas-config-panel.component.scss']
})
export class CanvasConfigPanelComponent implements OnInit {
  resolutionPresets = RESOLUTION_PRESETS;
  canvasStyle$ = this.query.canvasStyle$;

  selectedTab: 'basic' | 'background' | 'advanced' = 'basic';

  backgroundType: 'color' | 'gradient' | 'image' = 'color';
  gradientType: 'linear' | 'radial' | 'conic' = 'linear';

  backgroundColor = '#ffffff';
  backgroundImage = '';
  backgroundSize = 'cover';
  backgroundPosition = 'center';
  backgroundRepeat = 'no-repeat';
  backgroundOpacity = 100;

  gradientAngle = 90;
  gradientColors: Array<{ color: string; position: number }> = [
    { color: '#ffffff', position: 0 },
    { color: '#000000', position: 100 }
  ];

  customWidth = 1920;
  customHeight = 1080;

  className = '';
  description = '';
  dataAttrs: Array<{ key: string; value: string }> = [];

  constructor(
    private canvasService: CanvasService,
    protected query: CanvasQuery
  ) {}

  ngOnInit(): void {
    this.canvasStyle$.subscribe(style => {
      this.customWidth = style.width;
      this.customHeight = style.height;
      this.className = style.className || '';
      this.description = style.description || '';

      if (typeof style.background === 'string') {
        this.backgroundColor = style.background;
        this.backgroundType = 'color';
      } else if (style.background) {
        const bg = style.background as BackgroundStyle;
        if (bg.gradient) {
          this.backgroundType = 'gradient';
          this.gradientType = bg.gradient.type;
          this.gradientAngle = bg.gradient.angle || 90;
          this.gradientColors = bg.gradient.colors;
        } else if (bg.backgroundImage) {
          this.backgroundType = 'image';
          this.backgroundImage = bg.backgroundImage;
          this.backgroundSize = bg.backgroundSize || 'cover';
          this.backgroundPosition = bg.backgroundPosition || 'center';
          this.backgroundRepeat = bg.backgroundRepeat || 'no-repeat';
        } else if (bg.backgroundColor) {
          this.backgroundType = 'color';
          this.backgroundColor = bg.backgroundColor;
        }
        this.backgroundOpacity = (bg.opacity ?? 1) * 100;
      }

      if (style.dataAttrs) {
        this.dataAttrs = Object.entries(style.dataAttrs).map(([key, value]) => ({ key, value }));
      }
    });
  }

  selectTab(tab: 'basic' | 'background' | 'advanced'): void {
    this.selectedTab = tab;
  }

  applyPreset(width: number, height: number): void {
    this.customWidth = width;
    this.customHeight = height;
    this.canvasService.applyResolutionPreset(width, height);
  }

  updateCustomSize(): void {
    if (this.customWidth > 0 && this.customHeight > 0) {
      this.canvasService.setCanvasSize(this.customWidth, this.customHeight);
    }
  }

  selectBackgroundType(type: 'color' | 'gradient' | 'image'): void {
    this.backgroundType = type;
    this.applyBackground();
  }

  updateBackgroundColor(color: string): void {
    this.backgroundColor = color;
    this.applyBackground();
  }

  updateBackgroundImage(): void {
    this.applyBackground();
  }

  updateBackgroundSize(): void {
    this.applyBackground();
  }

  updateBackgroundPosition(): void {
    this.applyBackground();
  }

  updateBackgroundRepeat(): void {
    this.applyBackground();
  }

  updateBackgroundOpacity(): void {
    this.applyBackground();
  }

  selectGradientType(type: 'linear' | 'radial' | 'conic'): void {
    this.gradientType = type;
    this.applyBackground();
  }

  updateGradientAngle(): void {
    this.applyBackground();
  }

  addGradientColor(): void {
    this.gradientColors.push({ color: '#000000', position: 50 });
    this.applyBackground();
  }

  removeGradientColor(index: number): void {
    if (this.gradientColors.length > 2) {
      this.gradientColors.splice(index, 1);
      this.applyBackground();
    }
  }

  updateGradientColor(index: number, color: string): void {
    this.gradientColors[index].color = color;
    this.applyBackground();
  }

  updateGradientPosition(index: number, position: number): void {
    this.gradientColors[index].position = position;
    this.applyBackground();
  }

  applyBackground(): void {
    if (this.backgroundType === 'color') {
      this.canvasService.setCanvasBackground(this.backgroundColor);
    } else if (this.backgroundType === 'gradient') {
      const gradient: GradientStyle = {
        type: this.gradientType,
        angle: this.gradientAngle,
        colors: this.gradientColors
      };

      const background: BackgroundStyle = {
        gradient,
        opacity: this.backgroundOpacity / 100
      };

      this.canvasService.setCanvasBackground(background);
    } else if (this.backgroundType === 'image') {
      const background: BackgroundStyle = {
        backgroundImage: this.backgroundImage,
        backgroundSize: this.backgroundSize,
        backgroundPosition: this.backgroundPosition,
        backgroundRepeat: this.backgroundRepeat,
        opacity: this.backgroundOpacity / 100
      };

      this.canvasService.setCanvasBackground(background);
    }
  }

  updateClassName(): void {
    this.canvasService.setCanvasClassName(this.className);
  }

  updateDescription(): void {
    this.canvasService.setCanvasDescription(this.description);
  }

  addDataAttr(): void {
    this.dataAttrs.push({ key: '', value: '' });
  }

  removeDataAttr(index: number): void {
    this.dataAttrs.splice(index, 1);
    this.applyDataAttrs();
  }

  updateDataAttr(): void {
    this.applyDataAttrs();
  }

  private applyDataAttrs(): void {
    const attrs: Record<string, string> = {};
    this.dataAttrs.forEach(attr => {
      if (attr.key) {
        attrs[attr.key] = attr.value;
      }
    });
    this.canvasService.setCanvasDataAttrs(attrs);
  }

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      desktop: '桌面端',
      tablet: '平板',
      mobile: '移动端'
    };
    return labels[category] || category;
  }
}
