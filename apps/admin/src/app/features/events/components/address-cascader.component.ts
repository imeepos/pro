import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface AddressData {
  province: string;
  city: string;
  district?: string;
}

const CHINA_REGIONS: { [key: string]: { [key: string]: string[] } } = {
  '北京市': {
    '北京市': ['东城区', '西城区', '朝阳区', '丰台区', '石景山区', '海淀区', '门头沟区', '房山区', '通州区', '顺义区', '昌平区', '大兴区', '怀柔区', '平谷区', '密云区', '延庆区']
  },
  '上海市': {
    '上海市': ['黄浦区', '徐汇区', '长宁区', '静安区', '普陀区', '虹口区', '杨浦区', '闵行区', '宝山区', '嘉定区', '浦东新区', '金山区', '松江区', '青浦区', '奉贤区', '崇明区']
  },
  '广东省': {
    '广州市': ['荔湾区', '越秀区', '海珠区', '天河区', '白云区', '黄埔区', '番禺区', '花都区', '南沙区', '从化区', '增城区'],
    '深圳市': ['罗湖区', '福田区', '南山区', '宝安区', '龙岗区', '盐田区', '龙华区', '坪山区', '光明区', '大鹏新区'],
    '珠海市': ['香洲区', '斗门区', '金湾区'],
    '东莞市': ['东城街道', '南城街道', '万江街道', '莞城街道', '石碣镇', '石龙镇', '茶山镇', '石排镇', '企石镇', '横沥镇', '桥头镇', '谢岗镇', '东坑镇', '常平镇', '寮步镇', '樟木头镇', '大朗镇', '黄江镇', '清溪镇', '塘厦镇', '凤岗镇', '大岭山镇', '长安镇', '虎门镇', '厚街镇', '沙田镇', '道滘镇', '洪梅镇', '麻涌镇', '望牛墩镇', '中堂镇', '高埗镇', '松山湖管委会', '东莞港', '东莞生态园']
  },
  '浙江省': {
    '杭州市': ['上城区', '拱墅区', '西湖区', '滨江区', '萧山区', '余杭区', '临平区', '钱塘区', '富阳区', '临安区', '桐庐县', '淳安县', '建德市'],
    '宁波市': ['海曙区', '江北区', '北仑区', '镇海区', '鄞州区', '奉化区', '象山县', '宁海县', '余姚市', '慈溪市'],
    '温州市': ['鹿城区', '龙湾区', '瓯海区', '洞头区', '永嘉县', '平阳县', '苍南县', '文成县', '泰顺县', '瑞安市', '乐清市', '龙港市']
  },
  '江苏省': {
    '南京市': ['玄武区', '秦淮区', '建邺区', '鼓楼区', '浦口区', '栖霞区', '雨花台区', '江宁区', '六合区', '溧水区', '高淳区'],
    '苏州市': ['姑苏区', '虎丘区', '吴中区', '相城区', '吴江区', '常熟市', '张家港市', '昆山市', '太仓市'],
    '无锡市': ['梁溪区', '锡山区', '惠山区', '滨湖区', '新吴区', '江阴市', '宜兴市']
  }
};

@Component({
  selector: 'app-address-cascader',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-3">
      <div class="flex gap-3">
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-700 mb-1">
            省份 <span class="text-red-500">*</span>
          </label>
          <select
            [(ngModel)]="selectedProvince"
            name="selectedProvince"
            (ngModelChange)="onProvinceChange()"
            [disabled]="disabled"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">请选择省份</option>
            <option *ngFor="let province of provinces" [value]="province">
              {{ province }}
            </option>
          </select>
        </div>

        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-700 mb-1">
            城市 <span class="text-red-500">*</span>
          </label>
          <select
            [(ngModel)]="selectedCity"
            name="selectedCity"
            (ngModelChange)="onCityChange()"
            [disabled]="disabled || !selectedProvince"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">请选择城市</option>
            <option *ngFor="let city of cities" [value]="city">
              {{ city }}
            </option>
          </select>
        </div>

        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-700 mb-1">
            区/县 <span class="text-gray-400 text-xs">(选填)</span>
          </label>
          <select
            [(ngModel)]="selectedDistrict"
            name="selectedDistrict"
            (ngModelChange)="onDistrictChange()"
            [disabled]="disabled || !selectedCity"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">请选择区/县</option>
            <option *ngFor="let district of districts" [value]="district">
              {{ district }}
            </option>
          </select>
        </div>
      </div>

      <div *ngIf="showFullAddress && fullAddress" class="text-sm text-gray-600">
        完整地址: {{ fullAddress }}
      </div>
    </div>
  `,
  styles: [`
    select {
      appearance: none;
      background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
      background-position: right 0.5rem center;
      background-repeat: no-repeat;
      background-size: 1.5em 1.5em;
      padding-right: 2.5rem;
    }
  `]
})
export class AddressCascaderComponent implements OnInit {
  @Input() province?: string;
  @Input() city?: string;
  @Input() district?: string;
  @Input() disabled = false;
  @Input() showFullAddress = true;

  @Output() addressChange = new EventEmitter<AddressData>();

  provinces: string[] = [];
  cities: string[] = [];
  districts: string[] = [];

  selectedProvince = '';
  selectedCity = '';
  selectedDistrict = '';

  ngOnInit(): void {
    this.provinces = Object.keys(CHINA_REGIONS);

    if (this.province) {
      this.selectedProvince = this.province;
      this.onProvinceChange();

      if (this.city) {
        this.selectedCity = this.city;
        this.onCityChange();

        if (this.district) {
          this.selectedDistrict = this.district;
        }
      }
    }
  }

  onProvinceChange(): void {
    this.cities = this.selectedProvince
      ? Object.keys(CHINA_REGIONS[this.selectedProvince] || {})
      : [];
    this.districts = [];
    this.selectedCity = '';
    this.selectedDistrict = '';
    this.emitChange();
  }

  onCityChange(): void {
    if (this.selectedProvince && this.selectedCity) {
      this.districts = CHINA_REGIONS[this.selectedProvince]?.[this.selectedCity] || [];
    } else {
      this.districts = [];
    }
    this.selectedDistrict = '';
    this.emitChange();
  }

  onDistrictChange(): void {
    this.emitChange();
  }

  emitChange(): void {
    if (this.selectedProvince && this.selectedCity) {
      this.addressChange.emit({
        province: this.selectedProvince,
        city: this.selectedCity,
        district: this.selectedDistrict || undefined
      });
    }
  }

  get fullAddress(): string {
    const parts = [this.selectedProvince, this.selectedCity, this.selectedDistrict].filter(Boolean);
    return parts.join(' ');
  }
}
