"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

/* Tabulator v4.0.0 (c) Oliver Folkerd */

var Filter = function Filter(table) {

	this.table = table; //hold Tabulator object

	this.filterList = []; //hold filter list
	this.headerFilters = {}; //hold column filters
	this.headerFilterElements = []; //hold header filter elements for manipulation

	this.changed = false; //has filtering changed since last render
};

//initialize column header filter
Filter.prototype.initializeColumn = function (column) {
	var self = this,
	    field = column.getField(),
	    filterElement,
	    editor,
	    editorElement,
	    cellWrapper,
	    typingTimer,
	    tagType,
	    attrType,
	    searchTrigger,
	    params;

	//handle successfull value change
	function success(value) {
		var filterType = tagType == "input" && attrType == "text" || tagType == "textarea" ? "partial" : "match",
		    type = "",
		    filterFunc;

		if (value) {
			switch (_typeof(column.definition.headerFilterFunc)) {
				case "string":
					if (self.filters[column.definition.headerFilterFunc]) {
						type = column.definition.headerFilterFunc;
						filterFunc = function filterFunc(data) {
							return self.filters[column.definition.headerFilterFunc](value, column.getFieldValue(data));
						};
					} else {
						console.warn("Header Filter Error - Matching filter function not found: ", column.definition.headerFilterFunc);
					}
					break;

				case "function":
					filterFunc = function filterFunc(data) {
						var params = column.definition.headerFilterFuncParams || {};
						var fieldVal = column.getFieldValue(data);

						params = typeof params === "function" ? params(value, fieldVal, data) : params;

						return column.definition.headerFilterFunc(value, fieldVal, data, params);
					};

					type = filterFunc;
					break;
			}

			if (!filterFunc) {
				switch (filterType) {
					case "partial":
						filterFunc = function filterFunc(data) {
							return String(column.getFieldValue(data)).toLowerCase().indexOf(String(value).toLowerCase()) > -1;
						};
						type = "like";
						break;

					default:
						filterFunc = function filterFunc(data) {
							return column.getFieldValue(data) == value;
						};
						type = "=";
				}
			}

			self.headerFilters[field] = { value: value, func: filterFunc, type: type };
		} else {
			delete self.headerFilters[field];
		}

		self.changed = true;

		self.table.rowManager.filterRefresh();
	}

	column.modules.filter = {
		success: success
	};

	//handle aborted edit
	function cancel() {}

	if (field) {

		filterElement = document.createElement("div");
		filterElement.classList.add("tabulator-header-filter");

		//set column editor
		switch (_typeof(column.definition.headerFilter)) {
			case "string":
				if (self.table.modules.edit.editors[column.definition.headerFilter]) {
					editor = self.table.modules.edit.editors[column.definition.headerFilter];
				} else {
					console.warn("Filter Error - Cannot build header filter, No such editor found: ", column.definition.editor);
				}
				break;

			case "function":
				editor = column.definition.headerFilter;
				break;

			case "boolean":
				if (column.modules.edit && column.modules.edit.editor) {
					editor = column.modules.edit.editor;
				} else {
					if (column.definition.formatter && self.table.modules.edit.editors[column.definition.formatter]) {
						editor = self.table.modules.edit.editors[column.definition.formatter];
					} else {
						editor = self.table.modules.edit.editors["input"];
					}
				}
				break;
		}

		if (editor) {

			cellWrapper = {
				getValue: function getValue() {
					return "";
				},
				getField: function getField() {
					return column.definition.field;
				},
				getElement: function getElement() {
					return filterElement;
				},
				getRow: function getRow() {
					return {
						normalizeHeight: function normalizeHeight() {}
					};
				}
			};

			params = column.definition.headerFilterParams || {};

			params = typeof params === "function" ? params() : params;

			editorElement = editor.call(self, cellWrapper, function () {}, success, cancel, params);

			//set Placeholder Text
			if (field) {
				self.table.modules.localize.bind("headerFilters|columns|" + column.definition.field, function (value) {
					editorElement.setAttribute("placeholder", typeof value !== "undefined" && value ? value : self.table.modules.localize.getText("headerFilters|default"));
				});
			} else {
				self.table.modules.localize.bind("headerFilters|default", function (value) {
					editorElement.setAttribute("placeholdder", typeof self.column.definition.headerFilterPlaceholder !== "undefined" && self.column.definition.headerFilterPlaceholder ? self.column.definition.headerFilterPlaceholder : value);
				});
			}

			//focus on element on click
			editorElement.addEventListener("click", function (e) {
				e.stopPropagation();
				editorElement.focus();
			});

			//live update filters as user types
			typingTimer = false;

			searchTrigger = function searchTrigger(e) {
				if (typingTimer) {
					clearTimeout(typingTimer);
				}

				typingTimer = setTimeout(function () {
					success(editorElement.value);
				}, 300);
			};

			editorElement.addEventListener("keyup", searchTrigger);
			editorElement.addEventListener("search", searchTrigger);

			column.modules.filter.headerElement = editorElement;

			//update number filtered columns on change
			attrType = editorElement.hasAttribute("type") ? editorElement.getAttribute("type").toLowerCase() : "";
			if (attrType == "number") {
				editorElement.addEventListener("change", function (e) {
					success(editorElement.value);
				});
			}

			//change text inputs to search inputs to allow for clearing of field
			if (attrType == "text" && this.table.browser !== "ie") {
				editorElement.setAttribute("type", "search");
				// editorElement.off("change blur"); //prevent blur from triggering filter and preventing selection click
			}

			//prevent input and select elements from propegating click to column sorters etc
			tagType = editorElement.tagName.toLowerCase();
			if (tagType == "input" || tagType == "select" || tagType == "textarea") {
				editorElement.addEventListener("mousedown", function (e) {
					e.stopPropagation();
				});
			}

			filterElement.appendChild(editorElement);

			column.contentElement.appendChild(filterElement);

			self.headerFilterElements.push(editorElement);
		}
	} else {
		console.warn("Filter Error - Cannot add header filter, column has no field set:", column.definition.title);
	}
};

//hide all header filter elements (used to ensure correct column widths in "fitData" layout mode)
Filter.prototype.hideHeaderFilterElements = function () {
	this.headerFilterElements.forEach(function (element) {
		element.style.display = 'none';
	});
};

//show all header filter elements (used to ensure correct column widths in "fitData" layout mode)
Filter.prototype.showHeaderFilterElements = function () {
	this.headerFilterElements.forEach(function (element) {
		element.style.display = '';
	});
};

//programatically set value of header filter
Filter.prototype.setHeaderFilterFocus = function (column) {
	if (column.modules.filter && column.modules.filter.headerElement) {
		column.modules.filter.headerElement.focus();
	} else {
		console.warn("Column Filter Focus Error - No header filter set on column:", column.getField());
	}
};

//programatically set value of header filter
Filter.prototype.setHeaderFilterValue = function (column, value) {
	if (column) {
		if (column.modules.filter && column.modules.filter.headerElement) {
			column.modules.filter.headerElement.value = value;
			column.modules.filter.success(value);
		} else {
			console.warn("Column Filter Error - No header filter set on column:", column.getField());
		}
	}
};

//check if the filters has changed since last use
Filter.prototype.hasChanged = function () {
	var changed = this.changed;
	this.changed = false;
	return changed;
};

//set standard filters
Filter.prototype.setFilter = function (field, type, value) {
	var self = this;

	self.filterList = [];

	if (!Array.isArray(field)) {
		field = [{ field: field, type: type, value: value }];
	}

	self.addFilter(field);
};

//add filter to array
Filter.prototype.addFilter = function (field, type, value) {
	var self = this;

	if (!Array.isArray(field)) {
		field = [{ field: field, type: type, value: value }];
	}

	field.forEach(function (filter) {

		filter = self.findFilter(filter);

		if (filter) {
			self.filterList.push(filter);

			self.changed = true;
		}
	});

	if (this.table.options.persistentFilter && this.table.modExists("persistence", true)) {
		this.table.modules.persistence.save("filter");
	}
};

Filter.prototype.findFilter = function (filter) {
	var self = this,
	    column;

	if (Array.isArray(filter)) {
		return this.findSubFilters(filter);
	}

	var filterFunc = false;

	if (typeof filter.field == "function") {
		filterFunc = function filterFunc(data) {
			return filter.field(data, filter.type || {}); // pass params to custom filter function
		};
	} else {

		if (self.filters[filter.type]) {

			column = self.table.columnManager.getColumnByField(filter.field);

			if (column) {
				filterFunc = function filterFunc(data) {
					return self.filters[filter.type](filter.value, column.getFieldValue(data));
				};
			} else {
				filterFunc = function filterFunc(data) {
					return self.filters[filter.type](filter.value, data[filter.field]);
				};
			}
		} else {
			console.warn("Filter Error - No such filter type found, ignoring: ", filter.type);
		}
	}

	filter.func = filterFunc;

	return filter.func ? filter : false;
};

Filter.prototype.findSubFilters = function (filters) {
	var self = this,
	    output = [];

	filters.forEach(function (filter) {
		filter = self.findFilter(filter);

		if (filter) {
			output.push(filter);
		}
	});

	return output.length ? output : false;
};

//get all filters
Filter.prototype.getFilters = function (all, ajax) {
	var self = this,
	    output = [];

	if (all) {
		output = self.getHeaderFilters();
	}

	self.filterList.forEach(function (filter) {
		output.push({ field: filter.field, type: filter.type, value: filter.value });
	});

	if (ajax) {
		output.forEach(function (item) {
			if (typeof item.type == "function") {
				item.type = "function";
			}
		});
	}

	return output;
};

//get all filters
Filter.prototype.getHeaderFilters = function () {
	var self = this,
	    output = [];

	for (var key in this.headerFilters) {
		output.push({ field: key, type: this.headerFilters[key].type, value: this.headerFilters[key].value });
	}

	return output;
};

//remove filter from array
Filter.prototype.removeFilter = function (field, type, value) {
	var self = this;

	if (!Array.isArray(field)) {
		field = [{ field: field, type: type, value: value }];
	}

	field.forEach(function (filter) {
		var index = -1;

		if (_typeof(filter.field) == "object") {
			index = self.filterList.findIndex(function (element) {
				return filter === element;
			});
		} else {
			index = self.filterList.findIndex(function (element) {
				return filter.field === element.field && filter.type === element.type && filter.value === element.value;
			});
		}

		if (index > -1) {
			self.filterList.splice(index, 1);
			self.changed = true;
		} else {
			console.warn("Filter Error - No matching filter type found, ignoring: ", filter.type);
		}
	});

	if (this.table.options.persistentFilter && this.table.modExists("persistence", true)) {
		this.table.modules.persistence.save("filter");
	}
};

//clear filters
Filter.prototype.clearFilter = function (all) {
	this.filterList = [];

	if (all) {
		this.clearHeaderFilter();
	}

	this.changed = true;

	if (this.table.options.persistentFilter && this.table.modExists("persistence", true)) {
		this.table.modules.persistence.save("filter");
	}
};

//clear header filters
Filter.prototype.clearHeaderFilter = function () {
	this.headerFilters = {};

	this.headerFilterElements.forEach(function (element) {
		element.value = "";
	});

	this.changed = true;
};

//filter row array
Filter.prototype.filter = function (rowList) {
	var self = this,
	    activeRows = [],
	    activeRowComponents = [];

	if (self.table.options.dataFiltering) {
		self.table.options.dataFiltering(self.getFilters());
	}

	if (!self.table.options.ajaxFiltering && (self.filterList.length || Object.keys(self.headerFilters).length)) {

		rowList.forEach(function (row) {
			if (self.filterRow(row)) {
				activeRows.push(row);
			}
		});
	} else {
		activeRows = rowList.slice(0);
	}

	if (self.table.options.dataFiltered) {

		activeRows.forEach(function (row) {
			activeRowComponents.push(row.getComponent());
		});

		self.table.options.dataFiltered(self.getFilters(), activeRowComponents);
	}

	return activeRows;
};

//filter individual row
Filter.prototype.filterRow = function (row) {
	var self = this,
	    match = true,
	    data = row.getData();

	self.filterList.forEach(function (filter) {
		if (!self.filterRecurse(filter, data)) {
			match = false;
		}
	});

	for (var field in self.headerFilters) {
		if (!self.headerFilters[field].func(data)) {
			match = false;
		}
	}

	return match;
};

Filter.prototype.filterRecurse = function (filter, data) {
	var self = this,
	    match = false;

	if (Array.isArray(filter)) {
		filter.forEach(function (subFilter) {
			if (self.filterRecurse(subFilter, data)) {
				match = true;
			}
		});
	} else {
		match = filter.func(data);
	}

	return match;
};

//list of available filters
Filter.prototype.filters = {

	//equal to
	"=": function _(filterVal, rowVal) {
		return rowVal == filterVal ? true : false;
	},

	//less than
	"<": function _(filterVal, rowVal) {
		return rowVal < filterVal ? true : false;
	},

	//less than or equal to
	"<=": function _(filterVal, rowVal) {
		return rowVal <= filterVal ? true : false;
	},

	//greater than
	">": function _(filterVal, rowVal) {
		return rowVal > filterVal ? true : false;
	},

	//greater than or equal to
	">=": function _(filterVal, rowVal) {
		return rowVal >= filterVal ? true : false;
	},

	//not equal to
	"!=": function _(filterVal, rowVal) {
		return rowVal != filterVal ? true : false;
	},

	//contains the string
	"like": function like(filterVal, rowVal) {
		if (filterVal === null || typeof filterVal === "undefined") {
			return rowVal === filterVal ? true : false;
		} else {
			if (typeof rowVal !== 'undefined' && rowVal !== null) {
				return String(rowVal).toLowerCase().indexOf(filterVal.toLowerCase()) > -1 ? true : false;
			} else {
				return false;
			}
		}
	},

	//in array
	"in": function _in(filterVal, rowVal) {
		if (Array.isArray(filterVal)) {
			return filterVal.indexOf(rowVal) > -1;
		} else {
			console.warn("Filter Error - filter value is not an array:", filterVal);
			return false;
		}
	}
};

Tabulator.prototype.registerModule("filter", Filter);