<template>
  <div class="content" style="height: calc(100% - 108px);padding: 0px 15px;">
    <div class="container-fluid" style="height: calc(100% - 0px);">
      <div class="container-fluid" style="background-color: #ffff;padding-left: 0px;">
        <div class="input-group mb-3" style="width:790px;margin-top:15px;">
          <!-- <strong style="font-size:30px">XXXXXXXX:</strong> -->
          <a
            class="navbar-brand"
            href="#"
            style="font-weight: 400;margin: 5px 0;font-size: 20px;color: #888;font-family:'Microsoft YaHei';"
          >BLE Mesh Topology Dashboard</a>

          <input
            type="text"
            class="form-control"
            placeholder="Enter Customer ID"
            id="searchModle"
            style="margin-top:5px;margin-left:15px"
          />
          <div
            class="input-group-append"
            style="cursor: pointer;height: 40px;margin-top:5px"
            @click="searchHandle"
          >
            <span class="input-group-text">search</span>
          </div>
        </div>
        <div class="collapse navbar-collapse justify-content-end"></div>
      </div>
      <div class="row" style="height: calc(100% - 0px);">
        <div
          class="col-md-5"
          style="flex: 0 0 48.666667%;max-width: 69.666667%;font-family:'Microsoft YaHei';"
        >
          <div class="sub_title_container">
            <strong>BLE Mesh Reachability</strong>
          </div>
          <div class="vis_main_container">
            <div
              v-show="dataState===1"
              id="leftNetworkDiv"
              style="width:100%;height: calc(100% - 70px);"
            ></div>
            <div v-show="dataState===0" class="ble_map_Div">
              <span style="color:gray"></span>
            </div>
            <div class="legend" style="font-family:'Microsoft YaHei';">
              <i class="fa fa-circle text-info"></i> Echo
              <i class="fa fa-circle text-success"></i> One Hop/Multi Hop
              <i class="fa fa-circle text-danger"></i> Node
            </div>
            <hr style="margin-bottom: 2px;" />
            <div
              slot="footer"
              style="color: #a9a9a9; cursor: pointer;font-family:'Microsoft YaHei';"
              @click="updateRender('1')"
            >
              <i class="fa fa-refresh"></i>Updated now
            </div>
          </div>
        </div>
        <div class="col-md-5" style="margin-left:30px;flex: 0 0 48.666667%;max-width: 69.666667%;">
          <div class="sub_title_container">
            <strong>BLE Mesh Node Assignment</strong>
          </div>
          <div class="vis_main_container">
            <div
              v-show="dataState===1"
              id="rightNetworkDiv"
              style="width:100%;height: calc(100% - 70px);"
            ></div>
            <div v-show="dataState===0" class="ble_map_Div">
              <span style="color:gray"></span>
            </div>
            <div class="legend" style="font-family:'Microsoft YaHei';">
              <i class="fa fa-circle text-info"></i> Echo
              <i class="fa fa-circle text-danger"></i> Node
            </div>
            <hr style="margin-bottom: 2px;" />
            <div
              slot="footer"
              style="color: #a9a9a9; cursor: pointer;font-family:'Microsoft YaHei';"
              @click="updateRender('2')"
            >
              <i class="fa fa-refresh"></i>Updated now
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import Vis from "vis";
import myData from '../data/BLEdata'

export default {
  components: {

  },
  data () {
    return {
      mynodesArray: [],  //save  all  nodes info
      myedgesArray: [],//save  all  edges info
      dataState: 0,  // save data request data
      currentState: '0',  //current state
    };
  },
  mounted () {
    document.getElementById('searchModle').focus()
  },
  watch: {

  },
  methods: {
    init (flag) {
      const _this = this;
      _this.fetchSecondLevelData(flag);
      _this.fetchEdgesArray(flag);
      _this.nodes = new Vis.DataSet(_this.mynodesArray);
      _this.edges = new Vis.DataSet(_this.myedgesArray);
      _this.$nextTick(() => {
        if (flag === '1') {
          _this.container = document.getElementById('leftNetworkDiv');
        }
        if (flag === '2') {
          _this.container = document.getElementById('rightNetworkDiv');
        }
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
            size: 25
          },
          color: {
            border: "#2B7CE9",
            background: "#97C2FC",
            highlight: {
              border: "#2B7CE9",
              background: "#D2E5FF"
            },
            hover: {
              border: "#2B7CE9",
              background: "#D2E5FF"
            }
          },
          borderWidth: 2,
          borderWidthSelected: 2
        },
        // edge setting
        edges: {
          width: 1,
          length: 260,
          color: {
            color: "#848484",
            highlight: "#848484",
            hover: "#848484",
            inherit: "from",
            opacity: 1.0
          },
          shadow: true,
          smooth: {
            // Set the connection status of two node
            enabled: true
          },
          arrows: { to: true }
        },
        physics: {
          enabled: true,
          barnesHut: {
            gravitationalConstant: -3000,
            centralGravity: 0.3,
            springLength: 120,
            springConstant: 0.04,
            damping: 0.09,
            avoidOverlap: 0
          }
        },

        interaction: {
          hover: true,
          dragNodes: true,
          dragView: true,
          hover: true,
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
        if (_this.currentState === '0') {
          _this.init('2')
          _this.currentState = '2';
        }
      })

    },
    searchHandle () {
      var searchValue = document.getElementById("searchModle").value.trim();
      this.dataState = 1;
      this.init('1')
    },
    fetchSecondLevelData (flag) {
      const self = this;
      var currentData = [];
      currentData = flag === '1' ? myData.nodes1 : myData.nodes2;
      self.mynodesArray = [];
      currentData.map(li => {
        let item = {
          id: "",
          label: "",
          type: "",
          color: "",
        };
        if (li.nodeType === "node") {
          item = {
            id: li.nodeId,
            label: li.nodeId,
            type: li.nodeType,
            color: { background: "#1DC7EA" },
          };

        }
        if (li.nodeType === "echo") {
          item = {
            id: li.nodeId,
            label: li.nodeId,
            type: li.nodeType,
            color: { background: "#FF4A55" }
          };
        }
        self.mynodesArray.push(item);
      });
    },
    fetchEdgesArray (flag) {
      const self = this;
      self.myedgesArray = [];
      var currentData = [];
      currentData = flag === '1' ? myData.nodes2 : myData.nodes1;
      currentData.map(val => {
        if (val.nodeType === "node") {
          val.parent.map(li => {
            let item = { from: "", to: "", label: "" };
            item = { from: li, to: val.nodeId, label: '' };
            self.myedgesArray.push(item);
          });
        }
      });
    },
    updateRender (flag) {
      flag === '1' ? this.init('1') : this.init('2')
    }
  },
}

</script>
<style>
.vis_main_container {
  width: 100%;
  border: 1px solid gray;
  height: calc(100% - 160px);
}
.ble_map_Div {
  width: 100%;
  height: 90%;
  line-height: 90%;
  padding-top: 30%;
  padding-left: 33%;
}
.sub_title_container {
  width: 100%;
  height: 150px;
  text-align: center;
  line-height: 150px;
  font-size: 25px;
  font-family: "Microsoft Yahei";
}
input::-webkit-input-placeholder {
  color: #696969 !important;
  font-family: "Microsoft Yahei" !important ;
}
</style>
