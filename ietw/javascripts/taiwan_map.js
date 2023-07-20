

  const TaiwanMap = new Vue({
    el: '#taiwan_map',
    data: {
      h1: '縣市',
      h2: '縣市英文',
    },
    methods: {
      async getTaiwanMap() {
        const width = (this.$refs.map.offsetWidth).toFixed(),
              height = (this.$refs.map.offsetHeight).toFixed();
  
        // 判斷螢幕寬度，給不同放大值
        let mercatorScale, w = document.getElementById("taiwan_map").offsetWidth;
        if(w > 1366) {
          mercatorScale = 11000;
        }
        else if(w <= 1366 && w > 480) {
          mercatorScale = 9000;
        }
        else {
          mercatorScale = 6000;
        }
  
        // d3：svg path 產生器
        var path = await d3.geo.path().projection(
          // !important 座標變換函式
          d3.geo
            .mercator()
            .center([121,24])
            .scale(mercatorScale)
            .translate([width, height/2.5])
        );
        
        // 讓d3抓svg，並寫入寬高
        var svg = await d3.select('#svg')
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', `${width*0.5/1.5} 0 ${width*1.5} ${height}`);
        
        // 讓d3抓GeoJSON檔，並寫入path的路徑
        var url = 'https://raw.githubusercontent.com/bebeboboha/taiwan_map/main/src/taiwan_country.geojson';
        await d3.json(url, (error, geometry) => {
          if (error) throw error;
  
          svg
            .selectAll('path')
            .data(geometry.features)
            .enter().append('path')
            .attr('d', path)
            .attr({
              // 設定id，為了click時加class用
              id: (d) => 'city' + d.properties.COUNTYSN
            })
            .on('mouseover', d => {
              this.h1 = d.properties.COUNTYNAME; // 換中文名
              this.h2 = d.properties.COUNTYENG; // 換英文名
              // 有 .active 存在，就移除 .active
              if(document.querySelector('.active')) {
                document.querySelector('.active').classList.remove('active');
              }
              // 被點擊的縣市加上 .active
              document.getElementById('city' + d.properties.COUNTYSN).classList.add('active');
            })
            .on('click', d => {
              this.h1 = d.properties.COUNTYNAME; // 換中文名
              // 有 .active 存在，就移除 .active
              if(document.querySelector('.active')) {
                document.querySelector('.active').classList.remove('active');
              }
              // 被點擊的縣市加上 .active
              document.getElementById('city' + d.properties.COUNTYSN).classList.add('active');
              // 被點擊的縣市 開啟連結
              window.open(d.properties.URL);
            });
        });
        return svg;
      },
    },
    mounted() {
  
      this.getTaiwanMap();
  
    }
  })