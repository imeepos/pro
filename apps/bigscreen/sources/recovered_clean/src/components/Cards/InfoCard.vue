<template>
  <div class="card" style="height:100%">
    <div class="card-header" v-if="$slots.header" style="height:20px">
      <slot name="header"></slot>
    </div>
    <div class="card-body" style="calc(100% -25px);font-family:'Microsoft YaHei';">
      <div class="info_Div" style="height:100%">
        <div
          style="width:100%;height:50px;line-height:50px;text-align:center;font-size:25px;font-weight:600;margin-top:20px"
        >Device Status</div>

        <div style="height:calc(100% - 55px);overflow-y:auto">
          <div v-if="activeType ==='CLOUD' || activeType ==='IOT_CLOUD'">
            <table border="0" cellspacing="0" width="100%" id="myTable">
              <tr
                v-if="friendlyName !==''"
                style="text-align:center;font-weight:600"
                @mouseover="trbgColorChange()"
                class="fadeTrClass"
              >
                <td class="leftTdClass">Friendly Name</td>
                <td>{{ friendlyName }}</td>
              </tr>
            </table>
          </div>

          <div v-if="activeType ==='GATEWAY'">
            <table border="0" cellspacing="0" width="100%" id="myTable">
              <tr
                v-if="friendlyName !==''"
                style="text-align:center;font-weight:600"
                @mouseover="trbgColorChange()"
                class="fadeTrClass"
              >
                <td class="leftTdClass">Friendly Name</td>
                <td>{{ friendlyName }}</td>
              </tr>
              <tr
                v-if="activeId !==''"
                style="text-align:center;font-weight:600"
                @mouseover="trbgColorChange()"
                class="fadeTrClass"
              >
                <td class="leftTdClass">DSN</td>
                <td>{{ activeId }}</td>
              </tr>
              <tr
                style="text-align:center;font-weight:600"
                @mouseover="trbgColorChange()"
                class="fadeTrClass"
              >
                <td class="leftTdClass">Node Type</td>
                <td>{{ activeType }}</td>
              </tr>
              <tr
                v-if="activeMake !==''"
                style="text-align:center;font-weight:600"
                @mouseover="trbgColorChange()"
                class="fadeTrClass"
              >
                <td class="leftTdClass">Device Type</td>
                <td>{{ activeMake }}</td>
              </tr>
              <tr
                v-if="firmwareVersion !==''"
                style="text-align:center;font-weight:600"
                @mouseover="trbgColorChange()"
                class="fadeTrClass"
              >
                <td class="leftTdClass">Firmware Version</td>
                <td>{{ firmwareVersion }}</td>
              </tr>
            </table>
          </div>

          <div v-if="activeType ==='IOT_DEVICE'">
            <table border="0" cellspacing="0" width="100%" id="myTable">
              <tr
                v-if="friendlyName !==''"
                style="text-align:center;font-weight:600"
                @mouseover="trbgColorChange()"
                class="fadeTrClass"
              >
                <td class="leftTdClass">Friendly Name</td>
                <td>{{ friendlyName }}</td>
              </tr>
              <tr
                v-if="activeType!==''"
                style="text-align:center;font-weight:600"
                @mouseover="trbgColorChange()"
                class="fadeTrClass"
              >
                <td class="leftTdClass">Node Type</td>
                <td>{{ activeType }}</td>
              </tr>
              <tr
                style="text-align:center;font-weight:600"
                @mouseover="trbgColorChange()"
                class="fadeTrClass"
              >
                <td class="leftTdClass">Connnectivity</td>
                <td>{{ connectivity }}</td>
              </tr>
              <tr
                style="text-align:center;font-weight:600"
                @mouseover="trbgColorChange()"
                class="fadeTrClass"
              >
                <td class="leftTdClass">Parent Cloud</td>
                <td class="autoTdClass">{{ gatewayNodeIds}}</td>
              </tr>
              <tr
                style="text-align:center;font-weight:600"
                @mouseover="trbgColorChange()"
                class="fadeTrClass"
              >
                <td class="leftTdClass">Thing Name</td>
                <td>{{ activeId }}</td>
              </tr>
            </table>
          </div>

          <div v-if="activeType ==='APPLIANCE'">
            <table border="0" cellspacing="0" width="100%" id="myTable">
              <!-- friendlyName -->
              <tr
                v-if="friendlyName !==''"
                style="text-align:center;font-weight:600"
                @mouseover="trbgColorChange()"
                class="fadeTrClass"
              >
                <td class="leftTdClass">Friendly Name</td>
                <td>{{ friendlyName }}</td>
              </tr>
              <!-- description -->
              <tr
                v-if="description!==''"
                style="text-align:center;font-weight:600"
                @mouseover="trbgColorChange()"
                class="fadeTrClass"
              >
                <td class="leftTdClass">Description</td>
                <td>{{ description }}</td>
              </tr>
              <!-- nodeId -->
              <tr
                v-if="activeId!==''"
                style="text-align:center;font-weight:600"
                @mouseover="trbgColorChange()"
                class="fadeTrClass"
              >
                <td class="leftTdClass">Endpoint ID</td>
                <td>{{ activeId }}</td>
              </tr>
              <!-- nodeType -->
              <tr
                v-if="activeType!==''"
                style="text-align:center;font-weight:600"
                @mouseover="trbgColorChange()"
                class="fadeTrClass"
              >
                <td class="leftTdClass">Node Type</td>
                <td>{{ activeType }}</td>
              </tr>
              <!-- displayCategories -->
              <tr
                v-if="displayCategories!==''"
                style="text-align:center;font-weight:600"
                @mouseover="trbgColorChange()"
                class="fadeTrClass"
              >
                <td class="leftTdClass">Display Categories</td>
                <td>{{ displayCategories }}</td>
              </tr>
              <!-- connectionState -->
              <tr
                v-if="connectionState!==''"
                style="text-align:center;font-weight:600"
                @mouseover="trbgColorChange()"
                class="fadeTrClass"
              >
                <td class="leftTdClass">Connection State</td>
                <td>{{ connectionState }}</td>
              </tr>
              <!-- capabilityState -->
              <tr
                v-if="capabilityState!==''"
                style="text-align:center;font-weight:600"
                @mouseover="trbgColorChange()"
                class="fadeTrClass"
              >
                <td class="leftTdClass">Capability State</td>
                <td>{{ capabilityState }}</td>
              </tr>
              <!-- make -->
              <tr
                v-if="manufacturerName !==''"
                style="text-align:center;font-weight:600"
                @mouseover="trbgColorChange()"
                class="fadeTrClass"
              >
                <td class="leftTdClass">manufacturer Name</td>
                <td>{{ manufacturerName }}</td>
              </tr>
              <!-- model -->
              <tr
                v-if="modelVersion!==''"
                style="text-align:center;font-weight:600"
                @mouseover="trbgColorChange()"
                class="fadeTrClass"
              >
                <td class="leftTdClass">Model</td>
                <td>{{ swVersion }}</td>
              </tr>
              <!-- connectivity -->
              <tr
                v-if="connectivity !==''"
                style="text-align:center;font-weight:600"
                @mouseover="trbgColorChange()"
                class="fadeTrClass"
              >
                <td class="leftTdClass">Connectivity</td>
                <td>{{ connectivity }}</td>
              </tr>
              <!-- gatewayNodeIds -->
              <tr
                v-if="gatewayNodeIds !==''"
                style="text-align:center;font-weight:600"
                @mouseover="trbgColorChange()"
                class="fadeTrClass"
              >
                <td class="leftTdClass">Parent Node</td>
                <td>{{ gatewayNodeIds }}</td>
              </tr>
              <!-- firmware version -->
              <tr
                v-if="firmwareVersion !==''"
                style="text-align:center;font-weight:600"
                @mouseover="trbgColorChange()"
                class="fadeTrClass"
              >
                <td class="leftTdClass">Firmware Version</td>
                <td>{{ firmwareVersion }}</td>
              </tr>
            </table>
          </div>
        </div>
      </div>
    </div>
    <div class="card-footer" v-if="$slots.footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>
<script>
import Card from "./Card.vue";

export default {
  name: "info-card",
  components: {
    Card
  },
  props: {
    chartOptions: {
      type: Object,
      default: () => {
        return {};
      }
    },
    appInfoFromGet: {
      type: Array,
      default: () => {
        return []
      }
    }
  },
  data () {
    return {
      chartId: "no-id",
      $Chartist: null,
      chart: null,
      activeNodeName: "please select node",
      customerSearchValue: "",
      activeId: "",
      activeLabel: "",
      activeContent: "",
      activeType: "",
      activeMake: "",
      connectivity: '',
      modelVersion: '',
      firmwareVersion: '',
      friendlyName: '',
      gatewayNodeIds: '',
      activeAppInfoFromGet: [],
      displayCategories: '',
      modelName: '',
      swVersion: '',
      connectionState: '',
      manufacturerName: '',
      capabilityState: '',
      description: '',
      currentTr: null,
    };
  },
  watch: {
    chartOptions: {
      handler (newVal) {
        var self = this;
        setTimeout(function (newnewVal) {

          self.activeType = "";
          self.connectivity = "";
          self.activeMake = "";
          self.modelVersion = "";
          self.firmwareVersion = "";
          self.activeId = "";
          self.friendlyName = "";
          if (newVal.nodeId !== '') {
            self.activeId = newVal.nodeId;
          }
          if (newVal.nodeType !== '') {
            self.activeType = newVal.nodeType;
          }
          if (newVal.connectivity !== undefined && newVal.connectivity.length > 0) {
            if (newVal.connectivity[0] !== 'MQTT/UNKNOWN' && newVal.connectivity[0] !== 'MQTT')
              self.connectivity = newVal.connectivity[0];
          }
          if (newVal.make !== undefined && newVal.make !== '') {
            self.activeMake = newVal.make;
          }
          if (newVal.modelVersion !== undefined && newVal.modelVersion !== '') {
            self.modelVersion = newVal.modelVersion;
          }
          if (newVal.firmwareVersion !== undefined && newVal.firmwareVersion !== '') {
            self.firmwareVersion = newVal.firmwareVersion;
          }
          if (newVal.friendlyName !== undefined && newVal.friendlyName !== '') {
            self.friendlyName = newVal.friendlyName;
            if (newVal.nodeType === 'CLOUD' || newVal.nodeType === 'IOT_CLOUD') {
              self.friendlyName = 'AWS_IOT_CLOUD';
            }
          }
          if (newVal.gatewayNodeIds !== undefined && newVal.gatewayNodeIds.length > 0) {
            self.gatewayNodeIds = newVal.gatewayNodeIds.join(", ")
          }
          if (newVal.nodeType === 'CLOUD' || newVal.nodeType === 'IOT_CLOUD') {
            self.gatewayNodeIds = 'AWS_IOT_CLOUD';
          }
          if (newVal.nodeType === 'IOT_DEVICE') {
            self.gatewayNodeIds = 'AWS_IOT_CLOUD';
          }
        }, 0)
      },
      deep: true
    },
    appInfoFromGet: {
      handler (newInfo) {
        const self = this;
        self.activeAppInfoFromGet = [];
        self.displayCategories = ''
        self.modelName = ''
        self.swVersion = ''
        self.connectionState = ''
        self.manufacturerName = ''
        self.capabilityState = ''
        self.description = ''
        if (newInfo.length > 0) {
          self.activeAppInfoFromGet = newInfo
          if (newInfo[0].displayCategories !== '') {
            self.displayCategories = newInfo[0].displayCategories.join(",");
          }
          if (newInfo[0].modelName !== '') {
            self.modelName = newInfo[0].modelName;
          }
          if (newInfo[0].swVersion !== '') {
            self.swVersion = newInfo[0].swVersion;
          }
          if (newInfo[0].connectionState !== '') {
            self.connectionState = newInfo[0].connectionState;
          }
          if (newInfo[0].manufacturerName !== '') {
            self.manufacturerName = newInfo[0].manufacturerName;
          }
          if (newInfo[0].capabilityStates !== '') {
            var current = []
            newInfo[0].capabilityStates.map(li => {
              current.push(JSON.stringify(li))
            })
            self.capabilityState = current
          }
          if (newInfo[0].description !== '') {
            self.description = newInfo[0].description;
          }
        }
        setTimeout(function (newInfo) {

        }, 2000)
      },
      deep: true
    }
  },
  methods: {
    trbgColorChange () {
      const self = this;
      var oObj = event.srcElement;
      if (self.currentTr) {
        self.currentTr.style.backgroundColor = "#FFF";
      }
      if (oObj.tagName.toLowerCase() == "td") {
        var oTr = oObj.parentNode;

        if (!oTr.tag) oTr.style.backgroundColor = "#E1E9FD";
        self.currentTr = oTr
      }
    }
  },
  async mounted () { }
};
</script>
<style>
.autoTdClass {
  width: 60%;
  height: auto;
  min-height: 50px;
  text-align: center;
  word-wrap: break-word;
  word-break: break-all;
  overflow: hidden;
}
.fadeTrClass {
  text-align: center;
  font-weight: 600;
  /* background: #f0f0f0; */
  border-bottom: 1px solid #dee1e6;
}
.leftTdClass {
  width: 40%;
  height: 50px;
  text-align: center;
}
tr.focus {
  background-color: #eee;
}
</style>
