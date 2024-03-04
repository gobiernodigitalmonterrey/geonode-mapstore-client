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

    const { plugins: loadedPlugins, pending } = useModulePlugins({
        pluginsEntries: getPlugins(plugins, 'module'),
        pluginsConfig
    }); // Se obtienen los plugins.

    const loading = loadingConfig || pending; // Se obtiene loading.
    const parsedPlugins = { ...loadedPlugins, ...getPlugins(plugins) };

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
