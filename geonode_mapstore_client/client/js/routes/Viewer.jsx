/*
 * Copyright 2021, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import url from 'url';
import isArray from 'lodash/isArray';
import { getMonitoredState } from '@mapstore/framework/utils/PluginsUtils';
import { getConfigProp } from '@mapstore/framework/utils/ConfigUtils';
import PluginsContainer from '@mapstore/framework/components/plugins/PluginsContainer';
import { requestResourceConfig, requestNewResourceConfig } from '@js/actions/gnresource';
import MetaTags from '@js/components/MetaTags';
import MainEventView from '@js/components/MainEventView';
import ViewerLayout from '@js/components/ViewerLayout';
import { createShallowSelector } from '@mapstore/framework/utils/ReselectUtils';
import { getResourceImageSource } from '@js/utils/ResourceUtils';
import useModulePlugins from '@mapstore/framework/hooks/useModulePlugins';
import { getPlugins } from '@mapstore/framework/utils/ModulePluginsUtils';

const urlQuery = url.parse(window.location.href, true).query;

const ConnectedPluginsContainer = connect(
    createShallowSelector(
        state => urlQuery.mode || (urlQuery.mobile || state.browser && state.browser.mobile ? 'mobile' : 'desktop'),
        state => getMonitoredState(state, getConfigProp('monitorState')),
        state => state?.controls,
        (mode, monitoredState, controls) => ({
            mode,
            monitoredState,
            pluginsState: controls
        })
    )
)(PluginsContainer);

const DEFAULT_PLUGINS_CONFIG = [];

function getPluginsConfiguration(name, pluginsConfig) {
    if (!pluginsConfig) {
        return DEFAULT_PLUGINS_CONFIG;
    }
    if (isArray(pluginsConfig)) {
        return pluginsConfig;
    }
    const { isMobile } = getConfigProp('geoNodeSettings') || {};
    if (isMobile && pluginsConfig) {
        return pluginsConfig[`${name}_mobile`] || pluginsConfig[name] || DEFAULT_PLUGINS_CONFIG;
    }
    return pluginsConfig[name] || DEFAULT_PLUGINS_CONFIG;
}

function ViewerRoute({
    name,
    pluginsConfig: propPluginsConfig,
    params,
    onUpdate,
    onCreate = () => {},
    loaderComponent,
    plugins,
    match,
    resource,
    siteName,
    resourceType,
    loadingConfig,
    configError
}) {

    const { pk } = match.params || {}; // Se extrae pk de match.params. Si match.params es undefined o null, pk será undefined.
    const pluginsConfig = getPluginsConfiguration(name, propPluginsConfig); // Se obtiene la configuración de los plugins.

    const loading = loadingConfig || pending; // Se obtiene loading.
    const parsedPlugins = { ...loadedPlugins, ...getPlugins(plugins) };

    if (resource) {
        const coords = JSON.stringify(resource?.extent?.coords) || "";
        const dataPluginsConfig = [
            {
                "name": "ActionNavbar",
                "cfg": {
                    "containerPosition": "header",
                    "leftMenuItems": [
                        {
                            "type": "plugin",
                            "size": "md",
                            "name": "DetailViewerButton"
                        },
                        {
                            "labelId": "gnviewer.save",
                            "showPendingChangesIcon": true,
                            "disableIf": "{!state('isNewResource') && !context.resourceHasPermission(state('gnResourceData'), 'change_resourcebase') && (!context.canCopyResource(state('gnResourceData'), state('user')) || !state('selectedLayerPermissions').includes('download_resourcebase'))}",
                            "type": "dropdown",
                            "items": [
                                {
                                    "type": "plugin",
                                    "name": "Save"
                                },
                                {
                                    "type": "plugin",
                                    "name": "SaveAs",
                                    "disableIf": "{!state('selectedLayerPermissions').includes('download_resourcebase') || !context.resourceHasPermission(state('gnResourceData'), 'download_resourcebase')}"
                                }
                            ]
                        },
                        {
                            "labelId": "gnviewer.view",
                            "type": "dropdown",
                            "items": [
                                {
                                    "type": "plugin",
                                    "name": "DetailViewerButton"
                                },
                                {
                                    "type": "link",
                                    "href": "{context.getMetadataDetailUrl(state('gnResourceData'))}",
                                    "labelId": "gnviewer.viewMetadata"
                                }
                            ]
                        },
                        {
                            "labelId": "gnviewer.edit",
                            "type": "dropdown",
                            "disableIf": "{!context.resourceHasPermission(state('gnResourceData'), 'change_resourcebase')}",
                            "items": [
                                {
                                    "type": "link",
                                    "href": "{context.getMetadataUrl(state('gnResourceData'))}",
                                    "labelId": "gnviewer.editMetadata"
                                },
                                {
                                    "type": "link",
                                    "href": "{'/datasets/' + (state('gnResourceData') || {}).alternate + '/metadata_upload'}",
                                    "labelId": "gnviewer.metadataUpload"
                                }
                            ]
                        },
                        {
                            "type": "plugin",
                            "name": "Share"
                        },
                        {
                            "labelId": "gnviewer.download",
                            "disableIf": "{!state('selectedLayerPermissions').includes('download_resourcebase') || context.isDocumentExternalSource(state('gnResourceData'))}",
                            "type": "dropdown",
                            "items": [
                                {
                                    "type": "plugin",
                                    "name": "LayerDownload"
                                },
                                {
                                    "type": "plugin",
                                    "name": "IsoDownload"
                                },
                                {
                                    "type": "plugin",
                                    "name": "DublinCoreDownload"
                                }
                            ]
                        },
                        {
                            "type": "plugin",
                            "name": "DeleteResource",
                            "disableIf": "{!context.resourceHasPermission(state('gnResourceData'), 'delete_resourcebase')}"
                        }
                    ],
                    "rightMenuItems": [
                        {
                            "type": "plugin",
                            "name": "FullScreen"
                        }
                    ]
                }
            },
            {
                "name": "FeatureEditor",
                "cfg": {
                    "hideCloseButton": true,
                    "hideLayerTitle": true,
                    "tabular": true
                }
            },
            {
                "name": "SaveAs",
                "cfg": {
                    "disablePermission": true
                }
            },
            {
                "name": "Save",
                "cfg": {
                    "disablePermission": true
                }
            },
            {
                "name": "Share",
                "cfg": {
                    "containerPosition": "rightOverlay",
                    "enableGeoLimits": true
                }
            },
            {
                "name": "DetailViewer",
                "cfg": {
                    "containerPosition": "rightOverlay",
                    "tabs": [
                        {
                            "type": "tab",
                            "id": "info",
                            "labelId": "gnviewer.info",
                            "items": [
                                {
                                    "type": "text",
                                    "labelId": "gnviewer.title",
                                    "value": "{context.get(state('gnResourceData'), 'title')}"
                                },
                                {
                                    "type": "link",
                                    "labelId": "gnviewer.owner",
                                    "href": "{'/people/profile/' + context.get(state('gnResourceData'), 'owner.username')}",
                                    "value": "{context.getUserResourceName(context.get(state('gnResourceData'), 'owner'))}",
                                    "disableIf": "{!context.get(state('gnResourceData'), 'owner.username')}"
                                },
                                {
                                    "type": "date",
                                    "format": "YYYY-MM-DD HH:mm",
                                    "labelId": "{'gnviewer.'+context.get(state('gnResourceData'), 'date_type')}",
                                    "value": "{context.get(state('gnResourceData'), 'date')}"
                                },
                                {
                                    "type": "date",
                                    "format": "YYYY-MM-DD HH:mm",
                                    "labelId": "gnviewer.created",
                                    "value": "{context.get(state('gnResourceData'), 'created')}"
                                },
                                {
                                    "type": "date",
                                    "format": "YYYY-MM-DD HH:mm",
                                    "labelId": "gnviewer.lastModified",
                                    "value": "{context.get(state('gnResourceData'), 'last_updated')}"
                                },
                                {
                                    "type": "query",
                                    "labelId": "gnviewer.resourceType",
                                    "value": "{context.get(state('gnResourceData'), 'resource_type')}",
                                    "pathname": "/",
                                    "query": {
                                        "f": "{context.get(state('gnResourceData'), 'resource_type')}"
                                    }
                                },
                                {
                                    "type": "{context.isDocumentExternalSource(state('gnResourceData')) ? 'link' : 'text'}",
                                    "labelId": "gnviewer.sourceType",
                                    "value": "{context.get(state('gnResourceData'), 'sourcetype', '').toLowerCase()}",
                                    "href": "{context.get(state('gnResourceData'), 'href')}"
                                },
                                {
                                    "type": "query",
                                    "labelId": "gnviewer.category",
                                    "value": "{context.get(state('gnResourceData'), 'category.gn_description')}",
                                    "pathname": "/",
                                    "query": {
                                        "filter{category.identifier}": "{context.get(state('gnResourceData'), 'category.identifier')}"
                                    }
                                },
                                {
                                    "type": "query",
                                    "labelId": "gnviewer.keywords",
                                    "value": "{context.get(state('gnResourceData'), 'keywords')}",
                                    "valueKey": "name",
                                    "pathname": "/",
                                    "queryTemplate": {
                                        "filter{keywords.slug.in}": "${slug}"
                                    }
                                },
                                {
                                    "type": "query",
                                    "labelId": "gnviewer.regions",
                                    "value": "{context.get(state('gnResourceData'), 'regions')}",
                                    "valueKey": "name",
                                    "pathname": "/",
                                    "queryTemplate": {
                                        "filter{regions.code.in}": "${code}"
                                    }
                                },
                                {
                                    "type": "text",
                                    "labelId": "gnviewer.attribution",
                                    "value": "{context.get(state('gnResourceData'), 'attribution')}"
                                },
                                {
                                    "type": "html",
                                    "labelId": "gnviewer.supplementalInformation",
                                    "value": "{context.get(state('gnResourceData'), 'supplemental_information')}"
                                },
                                {
                                    "type": "date",
                                    "format": "YYYY-MM-DD HH:mm",
                                    "labelId": "gnviewer.temporalExtent",
                                    "value": {
                                        "start": "{context.get(state('gnResourceData'), 'temporal_extent_start')}",
                                        "end": "{context.get(state('gnResourceData'), 'temporal_extent_end')}"
                                    }
                                },
                                {
                                    "type": "link",
                                    "style": "label",
                                    "labelId": "gnviewer.viewFullMetadata",
                                    "href": "{context.getMetadataDetailUrl(state('gnResourceData'))}",
                                    "disableIf": "{!context.getMetadataDetailUrl(state('gnResourceData'))}"
                                }
                            ]
                        },
                        {
                            "type": "attribute-table",
                            "id": "attributes",
                            "labelId": "gnviewer.attributes",
                            "disableIf": "{context.get(state('gnResourceData'), 'resource_type') !== 'dataset'}",
                            "items": "{context.get(state('gnResourceData'), 'attribute_set')}"
                        },
                        {
                            "type": "linked-resources",
                            "id": "related",
                            "labelId": "gnviewer.linkedResources.label",
                            "items": "{context.get(state('gnResourceData'), 'linkedResources')}"
                        }
                    ]
                }
            },
            {
                "name": "DeleteResource"
            },
            {
                "name": "DownloadResource"
            },
            {
                "name": "Toolbar",
                "id": "NavigationBar",
                "cfg": {
                    "id": "navigationBar",
                    "layout": "horizontal"
                }
            },
            {
                "name": "MapLoading",
                "override": {
                    "Toolbar": {
                        "alwaysVisible": true
                    }
                }
            },
            {
                "name": "MapFooter"
            },
            {
                "name": "IsoDownload"
            },
            {
                "name": "DublinCoreDownload"
            },
            {
                "name": "LayerDownload",
                "cfg": {
                    "disablePluginIf": "{!state('selectedLayerPermissions').includes('download_resourcebase')}",
                    "hideServiceSelector": true,
                    "defaultSelectedService": "wps",
                    "formats": [
                        {
                            "name": "application/json",
                            "label": "GeoJSON",
                            "type": "vector",
                            "validServices": [
                                "wps"
                            ]
                        },
                        {
                            "name": "application/arcgrid",
                            "label": "ArcGrid",
                            "type": "raster",
                            "validServices": [
                                "wps"
                            ]
                        },
                        {
                            "name": "image/tiff",
                            "label": "TIFF",
                            "type": "raster",
                            "validServices": [
                                "wps"
                            ]
                        },
                        {
                            "name": "image/png",
                            "label": "PNG",
                            "type": "raster",
                            "validServices": [
                                "wps"
                            ]
                        },
                        {
                            "name": "image/jpeg",
                            "label": "JPEG",
                            "type": "raster",
                            "validServices": [
                                "wps"
                            ]
                        },
                        {
                            "name": "application/wfs-collection-1.0",
                            "label": "GML (FeatureCollection)",
                            "type": "vector",
                            "validServices": [
                                "wps"
                            ]
                        },
                        {
                            "name": "application/wfs-collection-1.1",
                            "label": "GML (WFS 1.1.0 FeatureCollection)",
                            "type": "vector",
                            "validServices": [
                                "wps"
                            ]
                        },
                        {
                            "name": "application/zip",
                            "label": "Shapefile",
                            "type": "vector",
                            "validServices": [
                                "wps"
                            ]
                        },
                        {
                            "name": "text/csv",
                            "label": "CSV",
                            "type": "vector",
                            "validServices": [
                                "wps"
                            ]
                        },
                        {
                            "name": "application/geopackage+sqlite3",
                            "label": "GeoPackage",
                            "type": "vector",
                            "validServices": [
                                "wps"
                            ]
                        },
                        {
                            "name": "application/geopackage+sqlite3",
                            "label": "GeoPackage",
                            "type": "raster",
                            "validServices": [
                                "wps"
                            ]
                        },
                        {
                            "name": "application/vnd.google-earth.kml+xml",
                            "label": "KML",
                            "type": "vector",
                            "validServices": [
                                "wps"
                            ]
                        }
                    ]
                }
            },
            {
                "name": "FilterLayer"
            },
            {
                "name": "QueryPanel",
                "cfg": {
                    "activateQueryTool": true,
                    "toolsOptions": {
                        "hideCrossLayer": true
                    },
                    "spatialOperations": [],
                    "spatialMethodOptions": []
                }
            },
            {
                "name": "Notifications"
            }
        ];
        // eslint-disable-next-line no-console
        console.log("resource.extent", resource.extent);
        if (coords === "[-1,-1,0,0]") {
            // eslint-disable-next-line no-param-reassign
            name = "dataset_edit_data_viewer";
            // eslint-disable-next-line no-console
            console.log("name", name);

            pluginsConfig = getPluginsConfiguration(name, dataPluginsConfig);
        } else {
            // eslint-disable-next-line no-console
            console.log("else", name);
            pluginsConfig = getPluginsConfiguration(name, propPluginsConfig);
        }
        // eslint-disable-next-line no-console
        console.log("pluginsConfig", pluginsConfig);
    }


    const { plugins: loadedPlugins, pending } = useModulePlugins({
        pluginsEntries: getPlugins(plugins, 'module'),
        pluginsConfig
    });
    useEffect(() => {
        if (!pending && pk !== undefined) {
            if (pk === 'new') {
                onCreate(resourceType);
            } else {
                onUpdate(resourceType, pk, {
                    page: name
                });
            }
        }
    }, [pending, pk]); // Se ejecuta onUpdate o onCreate si pk es diferente de undefined.

    const Loader = loaderComponent;
    const className = `page-${resourceType}-viewer`;

    useEffect(() => {
        // set the correct height of navbar
        const mainHeader = document.querySelector('.gn-main-header');
        const mainHeaderPlaceholder = document.querySelector('.gn-main-header-placeholder');
        const topbar = document.querySelector('#gn-topbar');
        function resize() {
            if (mainHeaderPlaceholder && mainHeader) {
                mainHeaderPlaceholder.style.height = mainHeader.clientHeight + 'px';
            }
            if (topbar && mainHeader) {
                topbar.style.top = mainHeader.clientHeight + 'px';
            }
        }
        // hide the navigation bar if a resource is being viewed
        if (!loading) {
            document.getElementById('gn-topbar')?.classList.add('hide-navigation');
            document.getElementById('gn-brand-navbar-bottom')?.classList.add('hide-search-bar');
            resize();
        }
        return () => {
            document.getElementById('gn-topbar')?.classList.remove('hide-navigation');
            document.getElementById('gn-brand-navbar-bottom')?.classList.remove('hide-search-bar');
            resize();
        };
    }, [loading]);

    return (
        <>
            {resource && <MetaTags
                logo={() => getResourceImageSource(resource?.thumbnail_url)}
                title={(resource?.title) ? `${resource?.title} - ${siteName}` : siteName }
                siteName={siteName}
                contentURL={resource?.detail_url}
                content={resource?.abstract}
            />}
            {!loading && <ConnectedPluginsContainer
                key={className}
                id={className}
                className={className}
                component={ViewerLayout}
                pluginsConfig={pluginsConfig}
                plugins={parsedPlugins}
                allPlugins={plugins}
                params={params}
            />}
            {loading && Loader && <Loader />}
            {configError && <MainEventView msgId={configError}/>}
        </>
    );
}

ViewerRoute.propTypes = {
    onUpdate: PropTypes.func
};

const ConnectedViewerRoute = connect(
    createSelector([
        state => state?.gnresource?.data,
        state => state?.gnsettings?.siteName || 'GeoNode',
        state => state?.gnresource?.loadingResourceConfig,
        state => state?.gnresource?.configError
    ], (resource, siteName, loadingConfig, configError) => ({
        resource,
        siteName,
        loadingConfig,
        configError
    })),
    {
        onUpdate: requestResourceConfig,
        onCreate: requestNewResourceConfig

    }
)(ViewerRoute);

ConnectedViewerRoute.displayName = 'ConnectedViewerRoute';

export default ConnectedViewerRoute;
