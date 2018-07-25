
import fetch from "isomorphic-fetch";

import GC_MS_nightly_62 from "./data/GC_MS_nightly_62.json";

export class MetricData {
  constructor(props) {
    this._active = {
      metric: "GC_MS",
      channel: "nightly",
      version: "62",
      data: GC_MS_nightly_62,
    };

    this.cached = {
      change: "",
      nfifthPercentile: "",
      median: "",
      mean: "",
      lastMedian: 315,
    };
  }

  get active() {
    return {
      metric: this._active.metric,
      channel: this._active.channel,
      version: this._active.version,
      data: this._active.data,
    };
  }

  get metricOptions() {
    return [
      "GC_MS",
      "HTTP_SCHEME_UPGRADE_TYPE",
      "scalars_devtools_onboarding_is_devtools_user"
    ];
  }

  get channelOptions() {
    return [
      "nightly",
      "beta",
      "dev edition",
      "release"
    ];
  }

  get versionOptions() {
    return ["60", "61", "62"];
  }

  get mean() {
    return this.getMean();
  }

  get median() {
    return this.getPercentile(50);
  }

  get nfifthPercentile() {
    return this.getPercentile(95);
  }

  get change() {
    return this.getChange();
  }

  updateCachedData() {
    this.cached.mean = this.getMean().toFixed(2);
    this.cached.median = this.getPercentile(50).toFixed(2);
    this.cached.nfifth = this.getPercentile(95).toFixed(2);
    this.cached.change = this.getChange().toFixed(2);
  }

  loadDataFor(metric, channel, version) {
    return fetch("https://mozilla.github.io/mdv2/data/" +
          metric + "_" +
          channel + "_" +
          version + ".json")
      .then(response => response.json())
      .then(data => {
        this._active.metric = metric;
        this._active.channel = channel;
        this._active.version = version;
        this._active.data = data;
        this.updateCachedData();
      });
  }

  getMean() {
    let currentData = this._active.data;
    let buckets = currentData.map(item => item.start)
                             .concat([this.getLastBucketUpper()]);
    let values = currentData.map(item => item.count);
    let totalHits = 0;
    let bucketHits = 0;
    let linearTerm = (buckets[buckets.length - 1] - buckets[buckets.length -2]) / 2;
    let exponentialFactor = Math.sqrt(buckets[buckets.length - 1] / buckets[buckets.length - 2]);
    let useLinearBuckets = this.kind === "linear" || this.kind === "flag" || this.kind === "boolean" || this.kind === "enumerated";

    for (let i = 0; i < values.length; i++) {
      totalHits += values[i];
      let centralX = useLinearBuckets ? buckets[i] + linearTerm : buckets[i] * exponentialFactor;
      bucketHits += values[i] * centralX;
    };

    return bucketHits / totalHits;
  }

  getLastBucketUpper() {
    let currentData = this._active.data;
    let buckets = currentData.map(item => item.start);
    if (currentData.length === 1) {
      return buckets[0] + 1;
    }

    /*if (this.state.activeMetric.type === "linear" || this.state.activeMetric.type === "flag" || this.state.activeMetric.type ===
    "boolean" || this.state.activeMetric.type === "enumerated") {
      return buckets[buckets.length - 1] + buckets[buckets.length - 1]
      - buckets[buckets.length -2];
    }*/

    return  buckets[buckets.length - 1] * buckets[buckets.length - 1] / buckets[buckets.length - 2];
  };

  getPercentile(percentile) {
    let currentData = this._active.data;
    let buckets = currentData.map(item => item.start);
    buckets = buckets.concat([this.getLastBucketUpper()]);
    let values = currentData.map(item => item.count);
    //let linearTerm = buckets[buckets.length - 1] - buckets[buckets.length - 2];
    let exponentialFactor = buckets[buckets.length - 1] / buckets[buckets.length - 2];
    let percentileCount = values.reduce((accumulator, currentValue) => accumulator + currentValue, 0) * (percentile / 100);
    let percentileBucketIndex = 0;
    while (percentileCount >= 0) {
      percentileCount -= currentData[percentileBucketIndex].count;
      percentileBucketIndex++;
    }
    percentileBucketIndex--;
    percentileCount += currentData[percentileBucketIndex].count;
    let ratioInBar = percentileCount / currentData[percentileBucketIndex].count;
    /*if (this.kind === "linear" || this.kind === "flag" || this.kind ===
    "boolean" || this.kind === "enumerated") {
      return buckets[percentileBucketIndex] + linearTerm * ratioInBar;
    } else {*/
    return buckets[percentileBucketIndex] * Math.pow(exponentialFactor, ratioInBar);
    //}
  }

  getChange() {
    let rawChange = this.getPercentile(50) - this.cached.lastMedian;
    let pctChange = (rawChange / this.cached.lastMedian) * 100;
    return pctChange;
  }
};