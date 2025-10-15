<template>
  <div class="row" style="height: 160px;">
    <div
      class="col-xl-3 col-md-6"
      style="flex: 0 0 25%; max-width: 35%;font-family:'Microsoft YaHei';"
    >
      <stats-card>
        <div slot="header" class="icon-warning">
          <i class="nc-icon nc-chart text-warning"></i>
        </div>
        <div slot="content" style="margin-top: 20px;font-family:'Microsoft YaHei';">
          <p class="card-category" style="font-family:'Microsoft YaHei';">CUSTOMER ID</p>
          <h4 class="card-title">{{ currentCustomer }}</h4>
        </div>
        <div slot="footer"></div>
      </stats-card>
    </div>

    <div class="col-xl-3 col-md-6" style="flex: 0 0 25%; max-width: 35%;">
      <stats-card>
        <div slot="header" class="icon-success">
          <i class="nc-icon nc-light-3 text-success"></i>
        </div>
        <div slot="content" style="margin-top: 20px;">
          <p
            class="card-category"
            style="font-family:'Microsoft YaHei';"
          >Echo Family Devices/FIRE TV</p>
          <h4 class="card-title">{{ efdTotal }}</h4>
        </div>
      </stats-card>
    </div>

    <div class="col-xl-3 col-md-6" style="flex: 0 0 25%; max-width: 35%;">
      <stats-card>
        <div slot="header" class="icon-danger">
          <i class="nc-icon nc-vector text-danger"></i>
        </div>
        <div slot="content" style="margin-top: 20px;">
          <p class="card-category" style="font-family:'Microsoft YaHei';">APPLIANCE</p>
          <h4 class="card-title">{{ appTotal }}</h4>
        </div>
      </stats-card>
    </div>
    <div class="col-xl-3 col-md-6">
      <stats-card>
        <div slot="header" class="icon-info">
          <i class="nc-icon nc-favourite-28 text-primary"></i>
        </div>
        <div slot="content" style="margin-top: 20px;">
          <p class="card-category" style="font-family:'Microsoft YaHei';">IOT_DEVICES</p>
          <h4 class="card-title">{{iotTotal}}</h4>
        </div>
      </stats-card>
    </div>
  </div>
</template>

<script>
import ChartCard from "src/components/Cards/InfoCard.vue";
import StatsCard from "src/components/Cards/StatsCard.vue";
export default {
  components: {
    ChartCard,
    StatsCard,

  },
  props: {
    totalInfo: {
      type: Object,
      default: () => {
        return {};
      }
    }
  },
  data () {
    return {
      efdTotal: 0,
      appTotal: 0,
      iotTotal: 0,
      cloudTotal: 0,
      currentCustomer: "",
    };
  },
  watch: {
    totalInfo: {
      handler (newVal) {
        this.efdTotal = newVal.efdTotal
        this.appTotal = newVal.appTotal
        this.iotTotal = newVal.iotTotal
        this.cloudTotal = newVal.cloudTotal
        this.currentCustomer = newVal.currentCustomer
      },
      deep: true
    }
  },
}

</script>
