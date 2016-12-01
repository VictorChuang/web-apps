/*
 *
 * (c) Copyright Ascensio System Limited 2010-2016
 *
 * This program is a free software product. You can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License (AGPL)
 * version 3 as published by the Free Software Foundation. In accordance with
 * Section 7(a) of the GNU AGPL its Section 15 shall be amended to the effect
 * that Ascensio System SIA expressly excludes the warranty of non-infringement
 * of any third-party rights.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR  PURPOSE. For
 * details, see the GNU AGPL at: http://www.gnu.org/licenses/agpl-3.0.html
 *
 * You can contact Ascensio System SIA at Lubanas st. 125a-25, Riga, Latvia,
 * EU, LV-1021.
 *
 * The  interactive user interfaces in modified source and object code versions
 * of the Program must display Appropriate Legal Notices, as required under
 * Section 5 of the GNU AGPL version 3.
 *
 * Pursuant to Section 7(b) of the License you must retain the original Product
 * logo when distributing the program. Pursuant to Section 7(e) we decline to
 * grant you any rights under trademark law for use of our trademarks.
 *
 * All the Product's GUI elements, including illustrations and icon sets, as
 * well as technical writing content are licensed under the terms of the
 * Creative Commons Attribution-ShareAlike 4.0 International. See the License
 * terms at http://creativecommons.org/licenses/by-sa/4.0/legalcode
 *
 */

/**
 *  Search.js
 *  Document Editor
 *
 *  Created by Alexander Yuzhin on 11/15/16
 *  Copyright (c) 2016 Ascensio System SIA. All rights reserved.
 *
 */


define([
    'core',
    'jquery',
    'underscore',
    'backbone',
    'documenteditor/mobile/app/view/Search'
], function (core, $, _, Backbone) {
    'use strict';

    DE.Controllers.Search = Backbone.Controller.extend(_.extend((function() {
        // private

        var _isShow = false,
            _startPoint = {};

        var pointerEventToXY = function(e){
            var out = {x:0, y:0};
            if(e.type == 'touchstart' || e.type == 'touchend'){
                var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
                out.x = touch.pageX;
                out.y = touch.pageY;
            } else if (e.type == 'mousedown' || e.type == 'mouseup') {
                out.x = e.pageX;
                out.y = e.pageY;
            }
            return out;
        };

        return {
            models: [],
            collections: [],
            views: [
                'Search'
            ],

            initialize: function() {
                this.addListeners({
                    'Search': {
                        'searchbar:show'        : this.onSearchbarShow,
                        'searchbar:hide'        : this.onSearchbarHide,
                        'searchbar:render'      : this.onSearchbarRender,
                        'searchbar:showsettings': this.onSearchbarSettings
                    }
                });
            },

            setApi: function(api) {
                this.api = api;
            },

            setMode: function (mode) {
                this.getView('Search').setMode(mode);
            },

            onLaunch: function() {
                var me = this;
                me.createView('Search').render();

                $('#editor_sdk').single('mousedown touchstart', _.bind(me.onEditorTouchStart, me));
                $('#editor_sdk').single('mouseup touchend',     _.bind(me.onEditorTouchEnd, me));
            },

            showSearch: function () {
                this.getView('Search').showSearch();
            },

            hideSearch: function () {
                this.getView('Search').hideSearch();
            },

            // Handlers

            onEditorTouchStart: function (e) {
                _startPoint = pointerEventToXY(e);
            },

            onEditorTouchEnd: function (e) {
                var _endPoint = pointerEventToXY(e);

                if (_isShow) {
                    var distance = Math.sqrt((_endPoint.x -= _startPoint.x) * _endPoint.x + (_endPoint.y -= _startPoint.y) * _endPoint.y);

                    if (distance < 1) {
                        this.hideSearch();
                    }
                }
            },

            onSearchbarRender: function(bar) {
                var me              = this,
                    searchString    = Common.SharedSettings.get('search-search') || '',
                    replaceString   = Common.SharedSettings.get('search-replace')|| '';

                me.searchBar = uiApp.searchbar('.searchbar.document .searchbar.search', {
                    customSearch: true,
                    onSearch    : _.bind(me.onSearchChange, me),
                    onEnable    : _.bind(me.onSearchEnable, me),
                    onClear     : _.bind(me.onSearchClear, me)
                });

                me.replaceBar = uiApp.searchbar('.searchbar.document .searchbar.replace', {
                    customSearch: true,
                    onSearch    : _.bind(me.onReplaceChange, me),
                    onEnable    : _.bind(me.onReplaceEnable, me),
                    onClear     : _.bind(me.onReplaceClear, me)
                });

                me.searchPrev = $('.searchbar.document .prev');
                me.searchNext = $('.searchbar.document .next');
                me.replaceBtn = $('.searchbar.document .link.replace');

                me.searchPrev.single('click', _.bind(me.onSearchPrev, me));
                me.searchNext.single('click', _.bind(me.onSearchNext, me));
                me.replaceBtn.single('click', _.bind(me.onReplace, me));

                $$('.searchbar.document .link.replace').on('taphold', _.bind(me.onReplaceAll, me));

                me.searchBar.search(searchString);
                me.replaceBar.search(replaceString);
            },

            onSearchbarSettings: function (view) {
                var strictBool = function (settingName) {
                    var value = Common.SharedSettings.get(settingName);
                    return !_.isUndefined(value) && (value === true);
                };

                var me              = this,
                    isReplace       = strictBool('search-is-replace'),
                    isCaseSensitive = strictBool('search-case-sensitive'),
                    isHighlight     = strictBool('search-highlight'),
                    $pageSettings   = $('.page[data-page=search-settings]'),
                    $inputType      = $pageSettings.find('input[name=search-type]'),
                    $inputCase      = $pageSettings.find('#search-case-sensitive input:checkbox'),
                    $inputHighlight = $pageSettings.find('#search-highlight-results input:checkbox');

                $inputType.val([isReplace ? 'replace' : 'search']);
                $inputCase.prop('checked', isCaseSensitive);
                $inputHighlight.prop('checked', isHighlight);

                // init events
                $inputType.single('change',      _.bind(me.onTypeChange, me));
                $inputCase.single('change',      _.bind(me.onCaseClick, me));
                $inputHighlight.single('change', _.bind(me.onHighlightClick, me));
            },

            onSearchbarShow: function(bar) {
                _isShow = true;
                this.api.asc_selectSearchingResults(Common.SharedSettings.get('search-highlight'));
            },

            onSearchEnable: function (bar) {
                this.replaceBar.container.removeClass('searchbar-active');
            },

            onSearchbarHide: function(bar) {
                _isShow = false;
                this.api.asc_selectSearchingResults(false);
            },

            onSearchChange: function(search) {
                var me = this,
                    isEmpty = (search.query.trim().length < 1);

                Common.SharedSettings.set('search-search', search.query);

                _.each([me.searchPrev, me.searchNext, me.replaceBtn], function(btn) {
                    btn.toggleClass('disabled', isEmpty);
                });
            },

            onSearchClear: function(search) {
                Common.SharedSettings.set('search-search', '');
//            window.focus();
//            document.activeElement.blur();
            },

            onReplaceChange: function(replace) {
                var me = this,
                    isEmpty = (replace.query.trim().length < 1);

                Common.SharedSettings.set('search-replace', replace.query);
            },

            onReplaceEnable: function (bar) {
                this.searchBar.container.removeClass('searchbar-active');
            },

            onReplaceClear: function(replace) {
                Common.SharedSettings.set('search-replace', '');
            },

            onSearchPrev: function(btn) {
                this.onQuerySearch(this.searchBar.query, 'back');
            },

            onSearchNext: function(btn) {
                this.onQuerySearch(this.searchBar.query, 'next');
            },

            onReplace: function (btn) {
                this.onQueryReplace(this.searchBar.query, this.replaceBar.query);
            },

            onReplaceAll: function (e) {
                var me = this,
                    popover = [
                    '<div class="popover" style="width: auto;">',
                        '<div class="popover-inner">',
                            '<div class="list-block">',
                                '<ul>',
                                    '<li><a href="#" id="replace-all" class="item-link list-button">{0}</li>'.format(me.textReplaceAll),
                                '</ul>',
                            '</div>',
                        '</div>',
                    '</div>'
                    ].join('');

                popover = uiApp.popover(popover, $$(e.currentTarget));

                $('#replace-all').single('click', _.bind(function () {
                    me.onQueryReplaceAll(this.searchBar.query, this.replaceBar.query);
                    uiApp.closeModal(popover);
                }, me))
            },

            onQuerySearch: function(query, direction) {
                var matchcase = Common.SharedSettings.get('search-case-sensitive') || false,
                    matchword = Common.SharedSettings.get('search-highlight') || false;

                if (query && query.length) {
                    if (!this.api.asc_findText(query, direction != 'back', matchcase, matchword)) {
                        var me = this;
                        uiApp.alert(
                            '',
                            me.textNoTextFound,
                            function () {
                                me.searchBar.input.focus();
                            }
                        );
                    }
                }
            },

            onQueryReplace: function(search, replace) {
                var matchcase = Common.SharedSettings.get('search-case-sensitive') || false,
                    matchword = Common.SharedSettings.get('search-highlight') || false;

                if (search && search.length) {
                    if (!this.api.asc_replaceText(search, replace, false, matchcase, matchword)) {
                        var me = this;
                        uiApp.alert(
                            '',
                            me.textNoTextFound,
                            function () {
                                me.searchBar.input.focus();
                            }
                        );
                    }
                }
            },

            onQueryReplaceAll: function(search, replace) {
                var matchcase = Common.SharedSettings.get('search-case-sensitive') || false,
                    matchword = Common.SharedSettings.get('search-highlight') || false;

                if (search && search.length) {
                    this.api.asc_replaceText(search, replace, true, matchcase, matchword);
                }
            },

            onTypeChange: function (e) {
                var me = this,
                    $target = $(e.currentTarget),
                    isReplace = ($target.val() === 'replace');

                Common.SharedSettings.set('search-is-replace', isReplace);
                $('.searchbar.document').toggleClass('replace', isReplace);
            },

            onCaseClick: function (e) {
                Common.SharedSettings.set('search-case-sensitive', $(e.currentTarget).is(':checked'));
            },

            onHighlightClick: function (e) {
                Common.SharedSettings.set('search-highlight', $(e.currentTarget).is(':checked'));
                this.api.asc_selectSearchingResults(Common.SharedSettings.get('search-highlight'));
            },

            // API handlers

            textNoTextFound: 'Text not found',
            textReplaceAll: 'Replace All'
        }
    })(), DE.Controllers.Search || {}))
});