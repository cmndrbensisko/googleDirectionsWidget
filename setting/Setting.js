///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////

define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/html',
    'dojo/_base/config',
    'dojo/Deferred',
    'dijit/_WidgetsInTemplateMixin',
    'jimu/BaseWidgetSetting',
    'jimu/utils',
    'jimu/portalUtils',
    'jimu/dijit/Message',
    'jimu/dijit/CheckBox',
    'jimu/dijit/ServiceURLInput',
    'dijit/form/NumberSpinner',
    'dijit/form/ValidationTextBox',
    'dijit/form/Select'
  ],
  function(declare, lang, html, dojoConfig, Deferred, _WidgetsInTemplateMixin, BaseWidgetSetting,
    jimuUtils, portalUtils, Message, CheckBox) {

    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
      baseClass: 'jimu-widget-directions-setting',
      _serviceUrlInputInvalidClass: "jimu-serviceurl-input-invalid",
      _routeTaskUrl:'',
      _locatorUrl:'http://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer',
      _travelModesUrl: "",
      _trafficLayerUrl: "",

      postMixInProperties: function(){
        if(!this.nls.complete){
          this.nls.complete = 'Complete';
        }
        if(!this.nls.completeNoEvents){
          this.nls.completeNoEvents = 'Complete No Events';
        }
        if(!this.nls.instructionsOnly){
          this.nls.instructionsOnly = 'Instructions Only';
        }
        if(!this.nls.standard){
          this.nls.standard = 'Standard';
        }
        if(!this.nls.summaryOnly){
          this.nls.summaryOnly = 'Summary Only';
        }
        if(!this.nls.travelModesUrl){
          this.nls.travelModesUrl = "Travel Modes URL";
        }
      },

      postCreate: function(){
        this.inherited(arguments);
        this.autoComplete = new CheckBox();
        this.autoComplete.placeAt(this.autoCompleteTd, 'first');
        html.addClass(this.autoComplete.domNode, 'class', 'jimu-float-leading');

        this.portal = portalUtils.getPortal(this.appConfig.portalUrl);

        this.locatorUrl.setProcessFunction(lang.hitch(this, function(){
          var url = this._getHandledUrlFromServiceUrlInput(this.locatorUrl);
          var reg = /\/rest\/services\/.+\/GeocodeServer/gi;
          return reg.test(url);
        }));

        this.portal.loadSelfInfo().then(lang.hitch(this, function(portalSelf){
          var locatorUrlFromPortal = this._getLocatorUrlFromPortalSelf(portalSelf);
          if(locatorUrlFromPortal){
            this.locatorUrl.set('placeHolder', locatorUrlFromPortal);
          }
        }));
      },

      _getHandledUrlFromServiceUrlInput: function(dijit){
        var value = dijit.get('value');
        var url = jimuUtils.removeSuffixSlashes(value);
        return url;
      },

      startup: function(){
        this.inherited(arguments);
        this.setConfig(this.config);
      },

      setConfig: function(config) {
        this.config = config;
        if(!this.config){
          return;
        }

        var geocoderOptions = this.config.geocoderOptions;
        if(geocoderOptions && typeof geocoderOptions === 'object'){
          this.autoComplete.setValue(geocoderOptions.autoComplete === true);
          this.maxLocations.set('value', geocoderOptions.maxLocations);
          this.minCharacters.set('value', geocoderOptions.minCharacters);
          this.searchDelay.set('value', geocoderOptions.searchDelay);
          var geocoders = geocoderOptions.geocoders;
          if(geocoders && geocoders.length > 0){
            var geocodeArgs = geocoders[0];
            this.placeholder.set('value', geocodeArgs.placeholder || '');
          }
        }

        this._getLocatorUrl().then(lang.hitch(this, function(locatorUrl){
          this.locatorUrl.set('value', locatorUrl);
        }));
      },

      _getRouteTaskUrl: function(){
        var def = new Deferred();
        if(this.config.routeTaskUrl){
          def.resolve(this.config.routeTaskUrl);
        }
        else{
          this.portal.loadSelfInfo().then(lang.hitch(this, function(response){
            var url = this._getRouteUrlFromPortalSelf(response);
            if(url){
              def.resolve(url);
            }else{
              def.resolve(this._routeTaskUrl);
            }
          }), lang.hitch(this, function(err){
            console.error(err);
            def.resolve(this._routeTaskUrl);
          }));
        }
        return def;
      },

      _getRouteUrlFromPortalSelf: function(portalSelf){
        var url = "";
        if(portalSelf && portalSelf.helperServices){
          var route = portalSelf.helperServices.route;
          if(route && route.url){
            url = route.url;
          }
        }
        return url;
      },

      _getLocatorUrl: function(){
        var def = new Deferred();
        var geocodeArgs = this.config.geocoderOptions &&
         this.config.geocoderOptions.geocoders &&
          this.config.geocoderOptions.geocoders[0];
        var url = geocodeArgs && geocodeArgs.url;
        if(url){
          def.resolve(url);
        }
        else{
          this.portal.loadSelfInfo().then(lang.hitch(this, function(response){
            var urlFromPortal = this._getLocatorUrlFromPortalSelf(response);
            if(urlFromPortal){
              def.resolve(urlFromPortal);
            }else{
              def.resolve(this._locatorUrl);
            }
          }), lang.hitch(this, function(err){
            console.error(err);
            def.resolve(this._locatorUrl);
          }));
        }
        return def;
      },

      _getLocatorUrlFromPortalSelf: function(portalSelf){
        var url = "";
        if(portalSelf && portalSelf.helperServices){
          var geocode = portalSelf.helperServices.geocode;
          if(geocode && geocode.length > 0){
            if(geocode[0] && geocode[0].url){
              url = geocode[0].url;
            }
          }
        }
        return url;
      },

      _getTravelModesUrl: function(){
        var def = new Deferred();
        if(this.config.travelModesUrl){
          def.resolve(this.config.travelModesUrl);
        }else{
          if(this.config.routeTaskUrl){
            //it's not the first time to open the setting page
            def.resolve(this.config.travelModesUrl);
          }else{
            //only get the default travelModesUrl first time
            this.portal.loadSelfInfo().then(lang.hitch(this, function(response){
              var urlFromPortal = this._getTravelModesUrlFromPortalSelf(response);
              if(urlFromPortal){
                def.resolve(urlFromPortal);
              }else{
                def.resolve("");
              }
            }), lang.hitch(this, function(err){
              console.error(err);
              def.reject(err);
            }));
          }
        }
        return def;
      },

      _getTravelModesUrlFromPortalSelf: function(portalSelf){
        var url = "";
        if(portalSelf && portalSelf.helperServices){
          var routingUtilities = portalSelf.helperServices.routingUtilities;
          if(routingUtilities && routingUtilities.url){
            url = routingUtilities.url;
          }
        }
        return url;
      },

      _getTrafficLayerUrlFromPortalSelf: function(portalSelf){
        var url = "";
        if(portalSelf && portalSelf.helperServices){
          var traffic = portalSelf.helperServices.traffic;
          if(traffic && traffic.url){
            url = traffic.url;
          }
        }
        return url;
      },

      getConfig: function() {
        if(this.locatorUrl.getStatus() !== 'valid'){
          this._showValidationErrorTip(this.locatorUrl);
          this._showParametersTip();
          return false;
        }

        if(!this.searchDelay.validate()){
          this._showValidationErrorTip(this.searchDelay);
          this._showParametersTip();
          return false;
        }

        if(!this.maxLocations.validate()){
          this._showValidationErrorTip(this.maxLocations);
          this._showParametersTip();
          return false;
        }

        if(!this.minCharacters.validate()){
          this._showValidationErrorTip(this.minCharacters);
          this._showParametersTip();
          return false;
        }

        this.config = {
          geocoderOptions: {
            autoComplete: this.autoComplete.getValue(),
            maxLocations: this.maxLocations.get('value'),
            minCharacters: this.minCharacters.get('value'),
            searchDelay: this.searchDelay.get('value'),
            arcgisGeocoder: false,
            geocoders: [{
              url: this._getHandledUrlFromServiceUrlInput(this.locatorUrl),
              placeholder: this.placeholder.get('value')
            }]
          }
        };

        return this.config;
      },

      _showValidationErrorTip:function(_dijit){
        if (!_dijit.validate() && _dijit.domNode) {
          if (_dijit.focusNode) {
            _dijit.focusNode.focus();
            setTimeout(lang.hitch(this, function() {
              _dijit.focusNode.blur();
            }), 100);
          }
        }
      },

      _showParametersTip: function(){
        new Message({
          message: this.nls.parametersTip
        });
      }

    });
  });