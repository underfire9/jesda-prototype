(function(t){function e(e){for(var s,l,r=e[0],c=e[1],o=e[2],u=0,p=[];u<r.length;u++)l=r[u],Object.prototype.hasOwnProperty.call(n,l)&&n[l]&&p.push(n[l][0]),n[l]=0;for(s in c)Object.prototype.hasOwnProperty.call(c,s)&&(t[s]=c[s]);d&&d(e);while(p.length)p.shift()();return i.push.apply(i,o||[]),a()}function a(){for(var t,e=0;e<i.length;e++){for(var a=i[e],s=!0,r=1;r<a.length;r++){var c=a[r];0!==n[c]&&(s=!1)}s&&(i.splice(e--,1),t=l(l.s=a[0]))}return t}var s={},n={formEditor:0},i=[];function l(e){if(s[e])return s[e].exports;var a=s[e]={i:e,l:!1,exports:{}};return t[e].call(a.exports,a,a.exports,l),a.l=!0,a.exports}l.m=t,l.c=s,l.d=function(t,e,a){l.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:a})},l.r=function(t){"undefined"!==typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},l.t=function(t,e){if(1&e&&(t=l(t)),8&e)return t;if(4&e&&"object"===typeof t&&t&&t.__esModule)return t;var a=Object.create(null);if(l.r(a),Object.defineProperty(a,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var s in t)l.d(a,s,function(e){return t[e]}.bind(null,s));return a},l.n=function(t){var e=t&&t.__esModule?function(){return t["default"]}:function(){return t};return l.d(e,"a",e),e},l.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},l.p="";var r=window["webpackJsonp"]=window["webpackJsonp"]||[],c=r.push.bind(r);r.push=e,r=r.slice();for(var o=0;o<r.length;o++)e(r[o]);var d=c;i.push([1,"chunk-vendors"]),a()})({"00ff":function(t,e,a){},1:function(t,e,a){t.exports=a("55f5")},"54b1":function(t,e,a){"use strict";a("00ff")},"55f5":function(t,e,a){"use strict";a.r(e);a("e260"),a("e6cf"),a("cca6"),a("a79d");var s=a("2b0e"),n=function(){var t=this,e=t.$createElement,a=t._self._c||e;return a("div",{staticClass:"main",attrs:{id:"form_editor"}},[a("div",{staticClass:"row"},[a("div",{staticClass:"col-2"},[a("div",{staticClass:"col-block"},[t._m(0),a("div",{staticClass:"block-content"},[a("div",{staticClass:"mt-0 md-form md-outline input-with-post-icon search"},[a("input",{directives:[{name:"model",rawName:"v-model",value:t.searchWords,expression:"searchWords"}],staticClass:"form-control rounded",attrs:{type:"search",placeholder:"搜尋元件","aria-label":"Search","aria-describedby":"search-addon"},domProps:{value:t.searchWords},on:{input:function(e){e.target.composing||(t.searchWords=e.target.value)}}}),a("i",{staticClass:"fa fa-search input-prefix"})]),a("draggable",{staticClass:"dragArea list-group insert-area",attrs:{list:t.defaultInsertContents,group:{name:"editor",pull:"clone",put:!1},clone:t.onClone,sort:!1},on:{change:t.log,choose:t.onChoose,unchoose:t.onUnchoose}},t._l(t.filterInsertContents,(function(e,s){return a("div",{key:s,staticClass:"list-group-item"},[t._v(t._s(e.label.CH))])})),0)],1)])]),a("div",{staticClass:"col-8"},[a("ul",{staticClass:"nav nav-tabs mb-0"},[a("li",{staticClass:"nav-item",on:{click:function(e){return t.changeI18n("CH")}}},[a("a",{staticClass:"nav-link",class:{active:"CH"==t.i18n}},[t._v("中文")])]),a("li",{staticClass:"nav-item",on:{click:function(e){return t.changeI18n("EN")}}},[a("a",{staticClass:"nav-link",class:{active:"EN"==t.i18n}},[t._v("英文")])])]),a("draggable",{on:{change:t.log},model:{value:t.defaultContents,callback:function(e){t.defaultContents=e},expression:"defaultContents"}},t._l(t.defaultContents,(function(e,s){return a("div",{key:s,staticClass:"col-block mb-20"},[a("div",{staticClass:"block-header has-border",on:{dblclick:function(a){return t.editContent(e)}}},[a("h3",[a("strong",[t._v(t._s(e.label[t.i18n]))])])]),a("div",{staticClass:"block-content"},[a("form",[a("draggable",{staticClass:"dragArea list-group",attrs:{list:e.items,group:"editor"},on:{change:t.log,choose:t.onChoose,unchoose:t.onUnchoose}},t._l(e.items,(function(e,n){return a("div",{key:n,staticClass:"form-group",class:{"edit-active":e.editorEnable},on:{dblclick:function(a){return t.editContent(e,s,n)}}},[e.editorEnable?a("button",{staticClass:"close",attrs:{type:"button","aria-label":"Close"},on:{click:function(e){return t.removeAt(s,n)}}},[a("span",{attrs:{"aria-hidden":"true"}},[t._v("×")])]):t._e(),e.setting&&e.setting.require?a("span",{staticClass:"form-request"},[t._v("*")]):t._e(),a("label",{attrs:{for:"content"+s+"_"+n}},[t._v(" "+t._s(e.label[t.i18n])+" ")]),"text"==e.type?a("input",{staticClass:"form-control",attrs:{id:"content"+s+"_"+n,placeholder:"CH"==t.i18n?"請輸入"+e.label.CH:"Enter "+e.label.EN}}):"select"==e.type?a("select",{staticClass:"browser-default custom-select",attrs:{id:"content"+s+"_"+n}},[a("option",{attrs:{value:"",disabled:"",selected:""}},[t._v(" "+t._s("CH"==t.i18n?"請選擇":"Choose your option")+" ")]),a("option",{attrs:{value:"1"}},[t._v("Option 1")]),a("option",{attrs:{value:"2"}},[t._v("Option 2")]),a("option",{attrs:{value:"3"}},[t._v("Option 3")])]):"multiple_select"==e.type?a("select",{staticClass:"form-control browser-default",attrs:{id:"content"+s+"_"+n,multiple:""}},[a("option",[t._v("1")]),a("option",[t._v("2")]),a("option",[t._v("3")]),a("option",[t._v("4")]),a("option",[t._v("5")])]):"checkbox"==e.type?a("div",[a("div",{staticClass:"form-check"},[a("input",{staticClass:"form-check-input",attrs:{type:"checkbox",id:"defaultCheck1"}}),a("label",{staticClass:"form-check-label",attrs:{for:"defaultCheck1"}},[t._v("必填")])])]):"radio"==e.type?a("div",[a("div",{staticClass:"custom-control form-check custom-control-inline"},[a("input",{staticClass:"form-check-input",attrs:{type:"radio",id:"customRadioInline1",name:"customRadioInline1"}}),a("label",{staticClass:"form-check-label",attrs:{for:"customRadioInline1"}},[t._v("Male")])]),a("div",{staticClass:"custom-control form-check custom-control-inline"},[a("input",{staticClass:"form-check-input",attrs:{type:"radio",id:"customRadioInline2",name:"customRadioInline1"}}),a("label",{staticClass:"form-check-label",attrs:{for:"customRadioInline2"}},[t._v("Female")])])]):"textarea"==e.type?a("textarea",{staticClass:"form-control",attrs:{id:"content"+s+"_"+n,rows:"3"}}):"file_input"==e.type?a("input",{staticClass:"form-control-file disable-click",attrs:{type:"file"}}):"name"==e.type?a("div",["CH"==t.i18n?a("input",{staticClass:"form-control",attrs:{id:"content"+s+"_"+n,placeholder:"請輸入"+e.label.CH}}):"EN"==t.i18n?a("div",{staticClass:"form-row"},[a("div",{staticClass:"col"},[a("input",{staticClass:"form-control",attrs:{type:"text",placeholder:"first"}})]),a("div",{staticClass:"col"},[a("input",{staticClass:"form-control",attrs:{type:"text",placeholder:"middle"}})]),a("div",{staticClass:"col"},[a("input",{staticClass:"form-control",attrs:{type:"text",placeholder:"last/family"}})])]):t._e()]):"timepicker"==e.type?a("div",{staticClass:"mt-0 mb-0 md-form md-outline input-with-post-icon timepicker"},[a("input",{staticClass:"form-control mb-0",attrs:{id:"content"+s+"_"+n,type:"text",placeholder:"CH"==t.i18n?"選擇時間":"Select time",readonly:""}}),a("i",{staticClass:"fa fa-clock-o input-prefix"})]):"datepicker"==e.type?a("div",{staticClass:"mt-0 mb-0 md-form md-outline input-with-post-icon datepicker",attrs:{id:"date-picker-example"}},[a("input",{staticClass:"form-control mb-0",attrs:{id:"content"+s+"_"+n,type:"text",placeholder:"CH"==t.i18n?"選擇日期":"Select date",readonly:""}}),a("i",{staticClass:"fa fa-calendar input-prefix",attrs:{tabindex:"0"}})]):"address"==e.type?a("div",{staticClass:"form-row"},[a("div",{staticClass:"col-4 mb-3"},[a("input",{staticClass:"form-control",attrs:{type:"text",placeholder:"CH"==t.i18n?"郵遞區號":"Zip Code"}})]),a("div",{staticClass:"col-8 mb-3"},[a("select",{staticClass:"browser-default custom-select"},[a("option",{attrs:{value:"",disabled:"",selected:""}},[t._v(" "+t._s("CH"==t.i18n?"請選擇國家":"Please Select Country")+" ")]),a("option",{attrs:{value:"1"}},[t._v("One")]),a("option",{attrs:{value:"2"}},[t._v("Two")]),a("option",{attrs:{value:"3"}},[t._v("Three")])])]),a("div",{staticClass:"col-4"},[a("input",{staticClass:"form-control",attrs:{type:"text",placeholder:"CH"==t.i18n?"城市":"City"}})]),a("div",{staticClass:"col-8"},[a("input",{staticClass:"form-control",attrs:{type:"text",placeholder:"CH"==t.i18n?"地址":"Address"}})])]):"table"==e.type?a("div",[e.setting.addable?a("button",{staticClass:"ml-0 btn btn-default btn-sm waves-effect waves-light",attrs:{title:"","data-toggle":"tooltip",type:"button"}},[t._v("新增")]):t._e(),a("div",{staticClass:"table-responsive"},[a("table",{staticClass:"table"},[a("thead",{staticClass:"grey lighten-3"},[a("tr",[a("th",{staticClass:"text-center",staticStyle:{"min-width":"50px",width:"50px"}},[t._v("#")]),e.setting.editable?a("th",{staticClass:"text-center",staticStyle:{"min-width":"110px",width:"110px"}},[t._v("操作")]):t._e(),t._l(t.listDatas[e.tableSn].columns,(function(e,s){return a("th",{key:s,staticClass:"text-center"},[t._v(t._s(e.label))])}))],2)]),a("tbody",t._l(t.listDatas[e.tableSn].datas,(function(s,n){return a("tr",{key:n},[a("td",[t._v(t._s(n+1))]),e.setting.editable?a("td",{staticClass:"text-center"},[a("div",{staticClass:"btn-group"},[a("button",{staticClass:"btn btn-xs btn-default waves-effect waves-light",attrs:{title:"","data-toggle":"tooltip",type:"button","data-original-title":"Edit Client"}},[a("i",{staticClass:"fa fa-pencil"})]),a("button",{staticClass:"btn btn-xs btn-default waves-effect waves-light",attrs:{title:"","data-toggle":"tooltip",type:"button","data-original-title":"Remove Client"}},[a("i",{staticClass:"fa fa-times"})])])]):t._e(),t._l(s,(function(e,s){return a("td",{key:s,staticClass:"text-center"},[t._v(t._s(e))])}))],2)})),0)])])]):"html"==e.type?a("div",{domProps:{innerHTML:t._s(e.renderHtml)}}):t._e(),e.des&&e.des[t.i18n]?a("small",{staticClass:"form-text text-muted"},[t._v(t._s(e.des[t.i18n]))]):t._e()])})),0)],1)])])})),0),a("button",{staticClass:"btn btn-light-blue btn-lg btn-block waves-effect waves-light",attrs:{type:"button"},on:{click:t.addDIV}},[t._v("建立 DIV 區塊")])],1),a("div",{staticClass:"col-2"},[a("div",{staticClass:"col-block"},[t._m(1),a("div",{staticClass:"block-content"},[0!=Object.keys(t.currentEdit).length?a("form",[a("div",{staticClass:"form-group"},[a("label",{attrs:{for:"label_CH"}},[t._v("標題中文")]),a("input",{directives:[{name:"model",rawName:"v-model",value:t.currentEdit.label.CH,expression:"currentEdit.label.CH"}],staticClass:"form-control form-control-sm",attrs:{id:"label_CH"},domProps:{value:t.currentEdit.label.CH},on:{input:function(e){e.target.composing||t.$set(t.currentEdit.label,"CH",e.target.value)}}})]),a("div",{staticClass:"form-group"},[a("label",{attrs:{for:"label_EN"}},[t._v("標題英文")]),a("input",{directives:[{name:"model",rawName:"v-model",value:t.currentEdit.label.EN,expression:"currentEdit.label.EN"}],staticClass:"form-control form-control-sm",attrs:{id:"label_EN"},domProps:{value:t.currentEdit.label.EN},on:{input:function(e){e.target.composing||t.$set(t.currentEdit.label,"EN",e.target.value)}}})]),t.editDiv?t._e():a("div",{staticClass:"form-group"},[a("label",{attrs:{for:"des_CH"}},[t._v("說明中文")]),a("textarea",{directives:[{name:"model",rawName:"v-model",value:t.currentEdit.des.CH,expression:"currentEdit.des.CH"}],staticClass:"form-control form-control-sm",attrs:{id:"des_CH",rows:"3"},domProps:{value:t.currentEdit.des.CH},on:{input:function(e){e.target.composing||t.$set(t.currentEdit.des,"CH",e.target.value)}}})]),t.editDiv?t._e():a("div",{staticClass:"form-group"},[a("label",{attrs:{for:"des_EN"}},[t._v("說明英文")]),a("textarea",{directives:[{name:"model",rawName:"v-model",value:t.currentEdit.des.EN,expression:"currentEdit.des.EN"}],staticClass:"form-control form-control-sm",attrs:{id:"des_EN",rows:"3"},domProps:{value:t.currentEdit.des.EN},on:{input:function(e){e.target.composing||t.$set(t.currentEdit.des,"EN",e.target.value)}}})]),"table"==t.currentEdit.type?a("div",{staticClass:"form-group"},[a("label",{attrs:{for:"des_EN"}},[t._v("列表")]),a("select",{directives:[{name:"model",rawName:"v-model",value:t.currentEdit.tableSn,expression:"currentEdit.tableSn"}],staticClass:"browser-default custom-select",on:{change:function(e){var a=Array.prototype.filter.call(e.target.options,(function(t){return t.selected})).map((function(t){var e="_value"in t?t._value:t.value;return e}));t.$set(t.currentEdit,"tableSn",e.target.multiple?a:a[0])}}},[a("option",{attrs:{value:"",disabled:"",selected:""}},[t._v("請選擇列表")]),t._l(t.listDatas,(function(e,s){return a("option",{key:s,domProps:{value:s}},[t._v(t._s(e.name))])}))],2)]):t._e(),t.editDiv?t._e():a("div",{staticClass:"form-group"},[a("label",{attrs:{for:"des_EN"}},[t._v("欄位設定")]),a("div",{staticClass:"form-check"},[a("input",{directives:[{name:"model",rawName:"v-model",value:t.currentEdit.setting.require,expression:"currentEdit.setting.require"}],staticClass:"form-check-input",attrs:{type:"checkbox",id:"defaultCheck1"},domProps:{checked:Array.isArray(t.currentEdit.setting.require)?t._i(t.currentEdit.setting.require,null)>-1:t.currentEdit.setting.require},on:{change:function(e){var a=t.currentEdit.setting.require,s=e.target,n=!!s.checked;if(Array.isArray(a)){var i=null,l=t._i(a,i);s.checked?l<0&&t.$set(t.currentEdit.setting,"require",a.concat([i])):l>-1&&t.$set(t.currentEdit.setting,"require",a.slice(0,l).concat(a.slice(l+1)))}else t.$set(t.currentEdit.setting,"require",n)}}}),a("label",{staticClass:"form-check-label",attrs:{for:"defaultCheck1"}},[t._v("必填")])]),t._m(2),t._m(3),t._m(4),"table"==t.currentEdit.type?a("div",{staticClass:"form-check"},[a("input",{directives:[{name:"model",rawName:"v-model",value:t.currentEdit.setting.editable,expression:"currentEdit.setting.editable"}],staticClass:"form-check-input",attrs:{type:"checkbox",id:"defaultCheck5"},domProps:{checked:Array.isArray(t.currentEdit.setting.editable)?t._i(t.currentEdit.setting.editable,null)>-1:t.currentEdit.setting.editable},on:{change:function(e){var a=t.currentEdit.setting.editable,s=e.target,n=!!s.checked;if(Array.isArray(a)){var i=null,l=t._i(a,i);s.checked?l<0&&t.$set(t.currentEdit.setting,"editable",a.concat([i])):l>-1&&t.$set(t.currentEdit.setting,"editable",a.slice(0,l).concat(a.slice(l+1)))}else t.$set(t.currentEdit.setting,"editable",n)}}}),a("label",{staticClass:"form-check-label",attrs:{for:"defaultCheck5"}},[t._v("可編輯")])]):t._e(),"table"==t.currentEdit.type?a("div",{staticClass:"form-check"},[a("input",{directives:[{name:"model",rawName:"v-model",value:t.currentEdit.setting.addable,expression:"currentEdit.setting.addable"}],staticClass:"form-check-input",attrs:{type:"checkbox",id:"defaultCheck6"},domProps:{checked:Array.isArray(t.currentEdit.setting.addable)?t._i(t.currentEdit.setting.addable,null)>-1:t.currentEdit.setting.addable},on:{change:function(e){var a=t.currentEdit.setting.addable,s=e.target,n=!!s.checked;if(Array.isArray(a)){var i=null,l=t._i(a,i);s.checked?l<0&&t.$set(t.currentEdit.setting,"addable",a.concat([i])):l>-1&&t.$set(t.currentEdit.setting,"addable",a.slice(0,l).concat(a.slice(l+1)))}else t.$set(t.currentEdit.setting,"addable",n)}}}),a("label",{staticClass:"form-check-label",attrs:{for:"defaultCheck6"}},[t._v("可新增")])]):t._e()]),t.editDiv?t._e():a("div",{staticClass:"form-group"},[a("label",{attrs:{for:"checkData"}},[t._v("資料檢查")]),a("textarea",{staticClass:"form-control form-control-sm",attrs:{id:"checkData",rows:"3"}})])]):t._e()])])])]),a("pre",[t._v(t._s(JSON.stringify(this.defaultContents,null,2)))])])},i=[function(){var t=this,e=t.$createElement,a=t._self._c||e;return a("div",{staticClass:"block-header has-border"},[a("h3",[a("strong",[t._v("表單元件")])])])},function(){var t=this,e=t.$createElement,a=t._self._c||e;return a("div",{staticClass:"block-header has-border"},[a("h3",[a("strong",[t._v("欄位設定")])])])},function(){var t=this,e=t.$createElement,a=t._self._c||e;return a("div",{staticClass:"form-check"},[a("input",{staticClass:"form-check-input",attrs:{type:"checkbox",value:"",id:"defaultCheck2"}}),a("label",{staticClass:"form-check-label",attrs:{for:"defaultCheck2"}},[t._v("個資欄位(加密儲存)")])])},function(){var t=this,e=t.$createElement,a=t._self._c||e;return a("div",{staticClass:"form-check"},[a("input",{staticClass:"form-check-input",attrs:{type:"checkbox",value:"",id:"defaultCheck3"}}),a("label",{staticClass:"form-check-label",attrs:{for:"defaultCheck3"}},[t._v("提供關鍵字搜尋")])])},function(){var t=this,e=t.$createElement,a=t._self._c||e;return a("div",{staticClass:"form-check"},[a("input",{staticClass:"form-check-input",attrs:{type:"checkbox",value:"",id:"defaultCheck4"}}),a("label",{staticClass:"form-check-label",attrs:{for:"defaultCheck4"}},[t._v("可匯出")])])}],l=(a("4de4"),a("4160"),a("a434"),a("ac1f"),a("466d"),a("159b"),a("5530")),r=a("b76a"),c=a.n(r),o={name:"form_editor",components:{draggable:c.a},data:function(){return{i18n:"CH",searchWords:"",currentEdit:{},listDatas:[{name:"樣版",columns:[{label:"111",key:"x1"},{label:"222",key:"x2"},{label:"333",key:"x3"}],datas:[{x1:"aa1",x2:"aa2",x3:"aa3"},{x1:"bb1",x2:"bb2",x3:"bb3"}]},{name:"計畫內容",columns:[{label:"執行單位",key:"x1"},{label:"單位代碼",key:"x2"},{label:"計畫主持人",key:"x3"},{label:"人事編號",key:"x4"},{label:"月支金額",key:"x5"},{label:"月支起訖日期",kex:"a6"}],datas:[{x1:"aa1",x2:"aa2",x3:"aa3",x4:"aa4",x5:"aa5",x6:"aa6"},{x1:"bb1",x2:"bb2",x3:"bb3",x4:"bb4",x5:"bb5",x6:"bb6"}]}],defaultInsertContents:[{type:"text",label:{CH:"文字輸入",EN:"input"},des:{},setting:{}},{type:"select",label:{CH:"下拉選單",EN:"select"},des:{},setting:{}},{type:"multiple_select",label:{CH:"多選項",EN:"multiple select"},des:{},setting:{}},{type:"checkbox",label:{CH:"核取方塊",EN:"checkbox"},des:{},setting:{}},{type:"radio",label:{CH:"單選項",EN:"radio"},des:{},setting:{}},{type:"textarea",label:{CH:"輸入區塊",EN:"textarea"},des:{},setting:{}},{type:"file_input",label:{CH:"檔案上傳",EN:"file input"},des:{},setting:{}},{type:"name",label:{CH:"姓名",EN:"name"},des:{},setting:{}},{type:"timepicker",label:{CH:"時間",EN:"timepicker"},des:{},setting:{}},{type:"datepicker",label:{CH:"日期",EN:"datepicker"},des:{},setting:{}},{type:"address",label:{CH:"地址",EN:"address"},des:{},setting:{}},{type:"table",label:{CH:"表格",EN:"table"},des:{},setting:{},tableSn:0},{type:"html",label:{CH:"自訂表格",EN:"custom-table"},des:{},setting:{},renderHtml:'<div class="row">\n                        <div class="table-responsive col-9">\n                            <table class="table">\n                                <thead class="grey lighten-3">\n                                    <tr>\n                                        <th\n                                            style="min-width: 50px; width: 50px;"\n                                            class="text-center"\n                                            rowspan="2"\n                                        >代碼</th>\n                                        <th\n                                            class="text-center"\n                                            rowspan="2"\n                                        >科目</th>\n                                        <th\n                                            class="text-center"\n                                            rowspan="2"\n                                        >金額</th>\n                                        <th\n                                            class="text-center"\n                                            colspan="2"\n                                        >可流用比</th>\n                                    </tr>\n                                    <tr>\n                                        <th\n                                            class="text-center"\n                                        >流入%</th>\n                                         <th\n                                            class="text-center"\n                                        >流出%</th>\n                                    </tr>\n                                </thead>\n                                <tbody>\n                                    <tr>\n                                        <td\n                                            class="text-center"\n                                        >01</td>\n                                        <td>人事費</td>\n                                        <td class="text-center">25</td>\n                                        <td class="text-center">31</td>\n                                        <td class="text-center">32</td>\n                                    </tr>\n                                    <tr>\n                                        <td\n                                            class="text-center"\n                                        >15</td>\n                                        <td>業務</td>\n                                        <td class="text-center">26</td>\n                                        <td class="text-center">33</td>\n                                        <td class="text-center">34</td>\n                                    </tr>\n                                    <tr>\n                                        <td\n                                            class="text-center"\n                                        >02</td>\n                                        <td>研究設備費</td>\n                                        <td class="text-center">27</td>\n                                        <td class="text-center">35</td>\n                                        <td class="text-center">3</td>\n                                    </tr>\n                                </tbody>\n                            </table>\n                        </div>\n                        <div class="col-3">\n                            *計畫經費請依相關規定執行。<br>\n                            *自90年4月1日起，凡申請專<br>\n                            題研究計畫聘用人員，如依規 定須參加勞、健保者，應於計 畫申請書『人事費』內自行編 列勞、健保雇主負擔部份。\n                            *管理費請依校內相關規定辦 理。\n                        </div>\n                    </div>'},{type:"html",label:{CH:"自訂文字",EN:"custom-text"},des:{},setting:{},renderHtml:"123"}],defaultContents:[{label:{CH:"名稱1",EN:"DIV1"},items:[{type:"text",label:{CH:"計畫編號",EN:"Project number"},des:{CH:"原委辦單位編號",EN:"Number of the original agency"},setting:{require:!0}},{type:"text",label:{CH:"計劃名稱",EN:"Droplist"},des:{},setting:{}},{type:"timepicker",label:{CH:"計劃名稱",EN:"timepicker"},des:{},setting:{}},{type:"datepicker",label:{CH:"計劃名稱",EN:"datepicker"},des:{},setting:{}}]},{label:{CH:"名稱2",EN:"DIV2"},items:[{type:"table",label:{CH:"計畫內容",EN:"Table"},des:{},setting:{editable:!0,addable:!0},tableSn:1},{type:"text",label:{CH:"計劃名稱",EN:"Droplist"},des:{},setting:{}}]}]}},computed:{filterInsertContents:function(){var t=this;return this.defaultInsertContents.filter((function(e){return e.label.CH.match(t.searchWords)}))}},mounted:function(){},methods:{removeAt:function(t,e){this.defaultContents[t].items.splice(e,1),this.currentEdit={}},log:function(t){console.log("log",t)},onChoose:function(){},onUnchoose:function(){},onBlur:function(){},onClone:function(t){return Object(l["a"])({},t)},editContent:function(t,e,a){this.closeEdit(),void 0!=e?(this.editDiv=!1,this.$set(this.defaultContents[e].items[a],"editorEnable",!0)):this.editDiv=!0,this.currentEdit=t},closeEdit:function(){var t=this;this.defaultContents.forEach((function(e,a){t.defaultContents[a].items.forEach((function(e,s){t.$set(t.defaultContents[a].items[s],"editorEnable",!1)}))}))},addDIV:function(){this.defaultContents.push({label:{CH:"名稱",EN:"DIV"},items:[]})},changeI18n:function(t){this.i18n=t}}},d=o,u=(a("54b1"),a("2877")),p=Object(u["a"])(d,n,i,!1,null,null,null),f=p.exports;s["a"].config.productionTip=!1,new s["a"]({render:function(t){return t(f)}}).$mount("#form_editor")}});
//# sourceMappingURL=formEditor.js.map