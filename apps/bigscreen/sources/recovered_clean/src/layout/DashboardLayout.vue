<template>
  <div class="wrapper">
    <!-- <side-bar>
      <sidebar-link to="/admin/overview">
        <div>
          <i class="nc-icon nc-atom"></i>
          <p>SH Network Topology</p>
        </div>
      </sidebar-link>
      <sidebar-link to="/admin/ble">
        <div>
          <i class="nc-icon nc-air-baloon"></i>
          <p>BLE Mesh Topology</p>
        </div>
      </sidebar-link>
    </side-bar>-->
    <div class="main-panel" style="width:calc(100% - 0px)">
      <dashboard-content @click="toggleSidebar"></dashboard-content>
    </div>
  </div>
</template>
<style lang="scss"></style>
<script>

import DashboardContent from "./Content.vue";
export default {
  components: {

    DashboardContent
  },
  methods: {
    toggleSidebar () {
      if (this.$sidebar.showSidebar) {
        this.$sidebar.displaySidebar(false);
      }
    },
    sidbarHandle (flag) {
      this.$store.commit("saveCustomerId", flag);
    }
  }
};
</script>
