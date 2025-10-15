<template>
  <div class="content" style="height: calc(100% - 8px); padding: 0px 0px">
    <!-- <div class="container-fluid" style="background-color: #ffff;width: 98%;padding-left: 0px">
      <div class="input-group mb-3" style="width:790px;margin-top:15px">
        <strong style="font-size:30px">XXXXXXXX:</strong>
        <a
          class="navbar-brand"
          href="#"
          style="font-weight: 400;margin: 5px 0;font-size: 20px;color: #888;font-family:'Microsoft YaHei';"
        >Smart Home Topology Dashboard</a>
        <input
          type="text"
          class="form-control"
          placeholder="Enter Customer ID"
          id="searchInput"
          style="margin-top: 5px;margin-left:15px"
        />
        <div
          class="input-group-append"
          style="cursor: pointer;height: 40px; margin-top: 5px;"
          @click="searchHandle"
        >
          <span class="input-group-text">search</span>
        </div>
      </div>
      <div class="collapse navbar-collapse justify-content-end"></div>
    </div>-->
    <div class="container-fluid" style="height: calc(100% - 5px)">
      <div
        id="network_id"
        class="map_Div"
        style="width: 100%; height: 100%"
      ></div>
      <!-- <SubMenu :totalInfo="totalInfo"></SubMenu> -->
      <!-- <div class="row" style="height: calc(100% - 0px);">
        <div
          class="col-md-8"
          style="
            height: 100%;
            border-radius: 4px;
            background-color: #ffffff;
            margin-bottom: 30px;
            border: 1px solid rgba(0, 0, 0, 0.125);
            margin-left: 1%;
            flex: 0 0 64.8%;
          "
        >
          <div class="topoTitle_class">Graph Panel</div>
          <div
            v-show="dataState===1"
            id="network_id"
            class="map_Div"
            style="width: 100%; height: 90%;"
          ></div>
          <div
            v-show="dataState===2"
            class="map_Div"
            style="width: 100%; height: 90%;line-height:90%;padding-top: 30%;padding-left: 46%;"
          >
            <img src="../assets/img/green.gif" alt />
          </div>
          <div
            v-show="dataState===0"
            class="map_Div"
            style="width: 100%; height: 90%;line-height:90%;padding-top: 30%;padding-left: 42%;"
          >
            <span style="color:gray"></span>
          </div>
          <div class="legend" style="font-family:'Microsoft YaHei';">
            <img src="../assets/img/square.png" width="16" height="16" /> Echo Family Device/Fire TV
            <img src="../assets/img/dot.png" width="16" height="16" /> Appliance
            <img src="../assets/img/triangle.png" width="16" height="16" /> IOT_DEVICES
            <img src="../assets/img/ellipse.png" width="23" height="18" /> CLOUD
          </div>
          <hr style="margin-bottom: 1px;" />
        </div>
        <div
          class="col-md-4"
          style="height: 100%; margin-left: 0.8%;font-family:'Microsoft YaHei';"
        >
          <chart-card :chartOptions="currentNodeinfo" :appInfoFromGet="currentAppInfoFromGet">
            <template slot="header">
              <p
                class="card-category"
                style="float: left; width: 95%;font-size:16px;font-family: Microsoft Yahei;"
              >Information Panel</p>
              <i
                class="nc-icon nc-single-copy-04 text-danger"
                style="float: left;margin-right: 5px;"
              ></i>
            </template>
            <template slot="footer">
              <div class="legend"></div>
              <hr style="margin-bottom: 15px;" />
            </template>
          </chart-card>
        </div>
      </div>-->
    </div>
  </div>
</template>
<script>
import ChartCard from "src/components/Cards/InfoCard.vue";
import StatsCard from "src/components/Cards/StatsCard.vue";
import SubMenu from './SubMenu'
import Vis from "vis";
import myData from "../data/topologyData";
import mygetwayData from '../data/devicesInfoData'
import testData from '../data/testdata2'

export default {
  components: {
    ChartCard,
    StatsCard,
    SubMenu
  },
  data () {
    return {
      efdTotal: 0,  // total number efd
      appTotal: 0,  // total number app
      iotTotal: 0,   // total number iot
      cloudTotal: 0,   // total number cloud
      currentNodeinfo: {},    // save curretn node  info
      currentCustomerId: "",   //save current  customerId
      responseJson: {},
      dataState: 0,
      totalInfo: {},
      totalGetwayInfo: [],   //all getwayinfo
      totalAppInfoFromGet: [],
      currentAppInfoFromGet: [],
      previousNodeId: '',   //save previous  node id
    };
  },
  methods: {
    SmartHomeTopology (customerId) {
      this.responseJson = {}
      /*
        harmony.authorization
              .getCloudAuthToken(challenge, host, roleArn)
              .then((cloudAuthResponse) =>
                fetch(`https://${host}`, {
                    method: 'POST',
                    body: JSON.stringify({
                        Operation: `${namespace}#${aaaOperation}`,
                        Service: `${namespace}#${aaaServiceName}`,
                          Input: {
                              customerId: customerId
                          },
                    }),
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${cloudAuthResponse.token}`,
                    },
                })
              )   
            .then((result) => result.json())   
            .then( data => {
                this.responseJson = data;
                this.checkData(this.responseJson);
                this.init();
                this.bindClickHandle()
            } )
        */
      // this.responseJson = myData;
      this.responseJson = testData;
      this.checkData(this.responseJson)
    },
    checkData (data) {
      console.log('testdata', data)
      const self = this
      self.init();
      // if (data.Output.smartHomeTopologyNodes === undefined) {
      //   alert('No Data Yet')
      //   return
      // }
      // else {
      //   self.init()
      // }
    },
    searchHandle () {
      var searchValue = document.getElementById("searchInput").value.trim();
      this.currentNodeinfo = {};
      this.currentAppInfoFromGet = [];
      this.$store.commit("saveCustomerId", searchValue);
    },
    init () {
      const _this = this;
      _this.fetchSecondLevelData();
      // console.log('_this.mynodesArray', _this.mynodesArray)
      _this.fetchEdgesArray();
      _this.nodes = new Vis.DataSet(_this.mynodesArray);
      _this.edges = new Vis.DataSet(_this.myedgesArray);
      _this.$nextTick(() => {
        _this.container = document.getElementById("network_id");
      })

      _this.data = {
        nodes: _this.nodes,
        edges: _this.edges
      };
      _this.options = {
        autoResize: true,
        groups: {
          useDefaultGroups: true,
          myGroupId: {},
          ws: {
            shape: "dot",
            color: "white"
          }
        },
        // Node configuration/setting 
        nodes: {
          shape: "square",
          widthConstraint: 80,
          font: {
            size: 25,
            align: 'middle',//位置left right center
          },
          color: {
            border: "#010E45",
            background: "#010E45",
            highlight: {
              border: "#010E45",
              background: "#010E45"
            },
            hover: {
              border: "#010E45",
              background: "#010E45"
            }
          },
          borderWidth: 1,
          borderWidthSelected: 1
        },
        // edge setting
        edges: {
          width: 1,
          length: 260,
          color: {
            color: "#61a5e8",
            highlight: "#848484",
            hover: "#848484",
            inherit: "from",
            opacity: 1.0
          },
          shadow: false,
          // smooth: {
          //   // Set the connection status of two node
          //   enabled: true // default to true. If set to false, line between two nodes will always be straight line
          // },
          smooth: false,
          arrows: { to: false }
        },
        physics: {
          enabled: true,
          barnesHut: {
            gravitationalConstant: -40000,
            centralGravity: 0.3,
            springLength: 200,
            springConstant: 0.001,
            damping: 0.09,
            avoidOverlap: 0
          },
          // stabilization: false
        },

        interaction: {
          hover: false,
          dragNodes: false,
          dragView: false,
          hover: false,
          multiselect: true,
          selectable: true,
          selectConnectedEdges: true,
          hoverConnectedEdges: true,
          zoomView: true
        },

        manipulation: {
          enabled: false,
          addNode: true,
          addEdge: true,
          editEdge: true,
          deleteNode: true,
          deleteEdge: true
        }
      };
      _this.$nextTick(() => {
        _this.network = new Vis.Network(
          _this.container,
          _this.data,
          _this.options
        );
        // _this.bindClickHandle()
      })
    },

    bindClickHandle () {
      const self = this
      this.network.on("click", params => {
        console.log("click", params);
        if (params.nodes.length > 0 && self.previousNodeId !== params.nodes[0]) {
          this.fetchDetails(params.nodes);
          this.previousNodeId = params.nodes[0]
        }
      });
      this.network.on("oncontext", params => {
        console.log("click", params);
      });
    },
    fetchDetails (node) {
      const self = this;
      self.currentNodeinfo = {};
      self.currentAppInfoFromGet = [];
      self.responseJson.Output.smartHomeTopologyNodes.map(li => {
        if (li.nodeId === node[0] && li.nodeType !== 'APPLIANCE') {
          self.currentNodeinfo = li;
        }
        if (li.nodeType === 'APPLIANCE' && li.nodeId === node[0]) {
          self.getAllGatewayTypeInfo(self.currentCustomerId, li.gatewayNodeIds[0], li)
        }
        if (li.nodeType === 'GATEWAY' && li.nodeId === node[0]) {
          self.getAllGatewayTypeInfo(self.currentCustomerId, li.nodeId, li)
        }
      });
    },
    fetchSecondLevelData () {
      const self = this;
      self.mynodesArray = [];
      self.efdTotal = 0;
      self.appTotal = 0;
      self.iotTotal = 0;
      self.cloudTotal = 0;
      self.responseJson.data.map((li, index) => {
        if (index <= 1837) {
          let item = {
            id: "",
            label: "",
            type: "",
            color: "",
            shape: '',
            size: '',
          };
          item = {
            id: li.target,
            // label: li.target,
            label: '',
            type: li.target,
            color: { background: "#1A4999" },
            shape: 'dot',
            size: li.size * 125
          };
          self.mynodesArray.push(item);
        }
      }
      );
      self.mynodesArray.push({
        id: "Pompeo",
        label: "",
        type: 'Pompeo',
        color: { background: "#010E45" },
        font: {
          size: 25,
          align: 'middle',//位置left right center  middle
        },
        shape: 'dot',
        size: 260,
      });
      // self.responseJson.Output.smartHomeTopologyNodes.map(li => {
      //   let item = {
      //     id: "",
      //     label: "",
      //     type: "",
      //     color: "",
      //     shape: '',
      //   };
      //   if (li.nodeType === "GATEWAY") {
      //     item = {
      //       id: li.nodeId,
      //       label: li.friendlyName,
      //       type: li.nodeType,
      //       color: { background: "#1DC7EA" },
      //       shape: 'square',
      //     };
      //     self.efdTotal += 1;
      //   }
      //   if (li.nodeType === "APPLIANCE") {
      //     item = {
      //       id: li.nodeId,
      //       label: li.friendlyName,
      //       type: li.nodeType,
      //       color: { background: "#FF4A55" },
      //       shape: 'dot',
      //     };
      //     self.appTotal += 1;
      //   }
      //   if (li.nodeType === "IOT_DEVICE") {
      //     item = {
      //       id: li.nodeId,
      //       label: li.friendlyName,
      //       type: li.nodeType,
      //       color: { background: "#54b07d" },
      //       shape: 'triangle',
      //     };
      //     self.iotTotal += 1;
      //   }
      //   if (li.nodeType === "CLOUD" || li.nodeType === "IOT_CLOUD") {
      //     item = {
      //       id: li.nodeId,
      //       label: "AWS_IOT_CLOUD",
      //       type: li.nodeType,
      //       color: { background: "#f0a810" },
      //       shape: 'ellipse',
      //     };
      //     self.cloudTotal += 1;
      //   }
      //   self.mynodesArray.push(item);
      //   self.totalInfo = { efdTotal: self.efdTotal, appTotal: self.appTotal, iotTotal: self.iotTotal, cloudTotal: self.cloudTotal, currentCustomer: self.currentCustomerId }
      // });
    },
    fetchEdgesArray () {
      const self = this;
      self.myedgesArray = [];
      self.responseJson.data.map((val, index) => {
        let item = { from: "", to: "", label: "" };
        if (index <= 1837) {
          item = { from: val.Source, to: val.target, label: "", width: 1, color: { color: "#61a5e8", } };
        }
        if (index > 1837) {
          item = { from: val.Source, to: val.target, label: "", width: 10, color: { color: 'green' }, smooth: true, arrows: { to: true } };
        }


        self.myedgesArray.push(item);
      });
      // self.responseJson.Output.smartHomeTopologyNodes.map(val => {
      //   if (val.nodeType === "APPLIANCE" || val.nodeType === "IOT_DEVICE") {
      //     val.gatewayNodeIds.map(li => {
      //       let item = { from: "", to: "", label: "" };
      //       if (val.connectivity[0] === "MQTT/UNKNOWN") {
      //         item = { from: li, to: val.nodeId, label: "" };
      //       } else {
      //         item = { from: li, to: val.nodeId, label: val.connectivity[0] };
      //       }
      //       self.myedgesArray.push(item);
      //     });
      //   }
      // });
    },
    fetchGatewayType () {
      const self = this
      self.responseJson.Output.smartHomeTopologyNodes.map(li => {
        if (li.nodeType === "GATEWAY") {
          self.getAllGatewayTypeInfo(self.currentCustomerId, li.nodeId)
        }
      })
    },
    async getAllGatewayTypeInfo (customerId, id, li) {
      const self = this
      self.totalGetwayInfo = [];
      self.totalAppInfoFromGet = [];
      /*
        harmony.authorization
              .getCloudAuthToken(challenge, host, roleArn)
              .then((cloudAuthResponse) =>
                fetch(`https://${host}`, {
                    method: 'POST',
                    body: JSON.stringify({
                        Operation: `${namespace}#${aaaOperation}`,
                        Service: `${namespace}#${aaaServiceName}`,
                          Input: {
                              customerId: customerId,
                              deviceId: deviceId
                          },
                    }),
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${cloudAuthResponse.token}`,
                    },
                })
              )   
            .then((result) => result.json())   
            .then( data => {
                var mygetwayData = data;
                if (mygetwayData.Output.smartHomeTopologyAppliancesNodes) {
                self.totalGetwayInfo = mygetwayData.Output.smartHomeTopologyAppliancesNodes
                self.totalAppInfoFromGet = [];
                if (self.totalGetwayInfo.length > 0) {
                  self.totalGetwayInfo.map(val => {
                    self.totalAppInfoFromGet.push(val)
                  })
                }
                return self.totalAppInfoFromGet
            } )
        */
      // var mygetwayData = getwayResponse;
      if (mygetwayData.Output.smartHomeTopologyAppliancesNodes) {
        self.totalGetwayInfo = mygetwayData.Output.smartHomeTopologyAppliancesNodes
        self.totalAppInfoFromGet = [];
        if (self.totalGetwayInfo.length > 0) {
          self.totalGetwayInfo.map(val => {
            if (val.nodeId === li.nodeId) {
              self.currentAppInfoFromGet.push(val)
            }
          })
        }
        self.currentNodeinfo = li;

      }
      if (mygetwayData.Output.smartHomeTopologyAppliancesNodes === undefined) {
        self.currentNodeinfo = li;
      }
    },
    fetchAppFromGetwayInfo (data) {
      const self = this
      self.totalAppInfoFromGet = [];
      if (data.length > 0) {
        data.map(val => {
          self.totalAppInfoFromGet.push(val)
        })
      }
    },
    updateRender () {
      this.init();
      this.bindClickHandle();
    }
  },
  mounted () {
    this.SmartHomeTopology();
    // document.getElementById('searchInput').focus()
  },
  computed: {
    getStoreItem () {
      return this.$store.state.customerId;
    }
  },
  watch: {
    getStoreItem () {
      const self = this;
      self.dataState = 1;
      self.currentCustomerId = self.$store.state.customerId;
      self.$nextTick(() => {
        self.SmartHomeTopology(self.currentCustomerId)
      })

    }
  }
};
</script>
<style>
.topoTitle_class {
  position: absolute;
  top: 15px;
  font-family: microsoft yahei;
  font-size: 16px;
  color: #9a9a9a;
}
input::-webkit-input-placeholder {
  color: #696969 !important;
  font-family: "Microsoft Yahei" !important;
}
</style>
