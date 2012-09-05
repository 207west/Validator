 /*!
 * Validator.js
 * Front-end validation engine.
 *
 * Copyright 2012, Adam Drago
 * 12:34 MicroTechnologies
 * http://12:34micro.com
 *
 * Date: Mon June 29 2012
 *
 * Requirements: 
 *					jquery.js, underscore.js, underscore.string.js, bootstrap.js
 *
 * Example Usage:
 * 	var myValidator = new Validator({
 *		fields: [
 *			{ name: "FirstName", $el: $("#txtFirstName"), tests: "required" },
 *			{ name: "LastName", $el: $("#txtLastName"), tests: "required" },
 *			{ name: "Address", $el: $("#txtAddress"), tests: "required" },
 *			{ name: "City", $el: $("#txtCity"), tests: "required" },
 *			{ name: "State", $el: $("#ddlState"), tests: "required" },
 *			{ name: "Zip", $el: $("#txtZip"), tests: "required, zip-us" },
 *			{ name: "Email", $el: $("#txtEmail"), tests: "required, email", pretest: function () { return $("#chkEmail").prop("checked"); } },
 *			{ name: "Phone", $el: $("#txtPhone"), tests: "required, phone-us", pretest: function () { return $("#chkPhone").prop("checked"); } },
 *			{ name: "EventType", $el: $("#ddlEventType") },
 *			{ name: "NumberOfAttendees", $el: $("#ddlNumberOfAttendees") },
 *			{ name: "EventDate", $el: $("#txtEventDate"), tests: "required" },
 *			{ name: "AdditionalInformation", $el: $("#txtAdditionalInformation") }
 *		],
 *      buttons: [
 *          { 
 *              type: Validator.ButtonType.SUBMIT, 
 *              $el: $("#btnSubmitForm"), 
 *              success: function () { alert("good job!"); }, 
 *              fail: function () { alert("something went wrong"); },
 *              always: function () { cleanup(); },
 *			    async: true
 *          },
 *          { type: Validator.ButtonType.CLEAR, $el: $("#btnClearForm") }
 *      ],
 *		formAdditions: {
 *			"Preference": function () { return $("#chkEmail").prop("checked") ? "Email" : "Phone"; }
 *		},
 *		messages: {
 *			"required": "This field is required.",
 *			"number": "This field must be a number.",
 *			"email": "This field must be an email address.",
 *			"phone-us": "This field must be a valid phone number.",
 *			"length:5": "This field must be 5 characters long."
 *		}
 *	});
 *
 *  Future:
 *      date range
 *      special chars
 */

(function () {

    "use strict";

    this.Validator = function (config) {
		/// <summary>Create a new Validator object.</summary>
		/// <param name="config" type="Object">Validator configuration.</param>
		/// <returns type="Object">Validator object.</returns>
        this.config = config;

        this.fields = config.fields;
        this.buttons = config.buttons;
        this.formAdditions = config.formAdditions;
        this.defaults = {};

        // showErrors will add/remove the error class to the
        // parent .control-group div, if it exists
        this.showErrors = config.showErrors || true;
        this.showMessages = config.showMessages || true;
        this.messages = config.messages;

        this.errorLabel = (config.errorLabel && !_.isBlank(config.errorLabel)) ? config.errorLabel : "<span class='badge badge-important'><i class='icon-exclamation-sign icon-white'></i></span>";
        this.errorLabelStyles = config.errorLabelStyles || { "padding": "1px", "margin-left": "5px" };

        this.initialize();
    };

    Validator.prototype = {
        initialize: function () {
			/// <summary>Initializes a new Validator object.</summary>
			/// <returns type="Validator">Validator object.</returns>
            var that = this;

            this.fields = _.map(this.fields, function (v) {
                var field = new Validator.Field(v);
                this.defaults[field.name] = field.$el.val();
                return field;
            }, this);

            this.buttons = _.map(this.buttons, function (v) {
                return (new Validator.Button(v));
            });

            setInterval(function () {
                var fieldsToCheck = _.filter(that.fields, function (v, k) { 
                    return v.$el.val() != that.defaults[v.name] && v.$el.data("vField").blurCount > 0; 
                });
                
                _.each(fieldsToCheck, function (v) {
                    that.check(v);
                });
            }, 1000);
            
            if (this.errorLabel) {
                this.$errorLabel = $(this.errorLabel);
                if (this.errorLabelStyles) {
                    this.$errorLabel.css(this.errorLabelStyles);
                }
                this.$errorLabelWrap = $("<span>").addClass("error-label").append(this.$errorLabel);
                this.errorLabelHtml = this.$errorLabelWrap[0].outerHTML;
            }

            if (this.showMessages) {
                $("form").on({
                    "focus": function () { 
                        $(this).closest(".control-group").find(".error-label").tooltip("show"); 
                    },
                    "blur": function () { 
                        var $this = $(this);

                        that.check($this.data("vField"));
                        $this.closest(".control-group").find(".error-label").tooltip("hide");

                        $this.data("vField").blurCount++;
                    }
                }, ".control-group input, .control-group textarea, .control-group select").on({
                    "mouseenter": function () {
                        var $controlGroup = $(this).closest(".control-group");
                        var $el = $controlGroup.find("input, select, textarea").eq(0);
                        if (!$el.is(":focus"))
                            $(this).tooltip("show");
                    },
                    "mouseleave": function () {
                        var $controlGroup = $(this).closest(".control-group");
                        var $el = $controlGroup.find("input, select, textarea").eq(0);
                        if (!$el.is(":focus"))
                            $(this).tooltip("hide");
                    }
                }, ".error-label");
            }
            
            // setup button events
            if (this.buttons) {
				_.each(this.buttons, function (v) {
                    switch(v.type) {
                        case Validator.ButtonType.SUBMIT:
							v.$el.on("click", function (event) {
								var vButton = $(this).data("vButton");
								if (that.run() !== true) {
						            vButton.fail.apply(this);
                                    vButton.always.apply(this);
						            event.preventDefault();
						            return false;
					            } else {
						            vButton.success.apply(this);
					                vButton.always.apply(this);
                                    return !vButton.async;
					            }
							});
                            break;
                        case Validator.ButtonType.CLEAR:
							v.$el.on("click", function (event) {
								var vButton = $(this).data("vButton");
								that.clear();
								vButton.always.apply(this);
                                return false;
							});
                            break;
                        default:
                            vButton.always.apply(this);
                            return false;
                            break;
                    }
                });
            }
        },

        run: function () {
			/// <summary>Runs the validator.</summary>
			/// <returns type="Validator.Result[]">Array of Validator.Result objects indicating the failures.</returns>
            var failures = []
              , successes = [];

            _.each(this.fields, function (v) {
                var field = v
                  , fieldResult = this.check(field);

                if (fieldResult.passed !== true) {
                    failures.push(fieldResult);
                } else {
                    successes.push(fieldResult);
                }
            }, this);

            return (failures.length > 0) ? failures : true;
        },

        form: function () {
			/// <summary>Gathers the form data from the specified fields.</summary>
			/// <returns type="Validator.Form">An object with the format { FieldName: FieldValue }</returns>
            return Validator.Form(this.fields, this.formAdditions);
        },

        check: function (field) {
			/// <summary>Validates a specific form field.</summary>
			/// <param name="field" type="Validator.Field">The field to be validated.</param>
			/// <returns type="Validator.Result">An object representing the result of the validation.</returns>
            if (field && (field.pretest === undefined || field.pretest() === true)) {
                var $controlGroup = field.$el.closest(".control-group")
                  , $errorLabel = $controlGroup.find(".error-label");
                
                for (var t = 0; t < field.tests.length; t++) {
                    var args
                      , test = field.tests[t];

                    if (_.str.include(test, ":")) {
                        var parts = field.tests[t].split(":");
                        test = parts.splice(0, 1);
                        args = parts;
                    }
					
					var result = Validator.Tests[test](field, args, this);

                    if (!result) {
                        if (this.showErrors) {
                            $controlGroup.addClass("error");
                            if (this.errorLabel && $controlGroup.find(".error-label").length == 0) {
                                field.$label.append(this.errorLabelHtml);
                            }
                        }

                        if (this.showMessages && this.messages) {
                            var $errorLabel = $controlGroup.find(".error-label");
                            
                            if (!$errorLabel.data("tooltip")) {
                                $errorLabel.tooltip({
                                    placement: "right",
                                    trigger: "manual",
                                    title: this.messages[test]
                                });
                            } else {
                                $errorLabel.data("tooltip").options.title = this.messages[test];
                            }
                        }

                        return new Validator.Result(field, false, test);
                    } else if (result && test == "creditcard") {
					   // TODO: CC test is successful, return the type of CC here
					}
                }

                if (this.showErrors) {
                    $controlGroup.removeClass("error");
                    if (this.errorLabel) {
                        $(".error-label", $controlGroup).tooltip("hide").remove();
                    }
                }
            }

            return new Validator.Result(field, true);
        },

        reset: function () {
			/// <summary>Resets all visible error information.</summary>
            $(".control-group.error").removeClass("error");
            $(".error-label").remove();
        },

        clear: function () {
			/// <summary>Clears all form data and resets all visible error information.</summary>
            _.each(this.fields, function (v) {
                var elType = v.$el.attr("type");
                if (elType == "radio" || elType == "checkbox") {
                    v.$el.prop("checked", false);
                } else {
                    v.$el.val(this.defaults[v.name]);
                }
            }, this);
            this.reset();
        }
    };
    
    Validator.Tests = {
        "required": function (field, allowWhitespace) {
            /// <signature>
            ///     <summary>Checks if the field is empty. Whitespace characters ('', '\n', ' ') are not considered valid.</summary>
            ///     <param name="field" type="Validator.Field">The field to be validated.</param>
            ///     <returns type="Boolean"></returns>
            /// </signature>
            /// <signature>
            ///     <summary>Checks if the field is empty. Whitespace characters ('', '\n', ' ') are only considered valid if the 'allowWhitespace' parameter is true.</summary>
            ///     <param name="field" type="Validator.Field">The field to be validated.</param>
            ///     <param name="allowWhitespace" type="Boolean">If true, non-empty whitespace characters ('\n', ' ') are allowed.</param>
            ///     <returns type="Boolean"></returns>
            /// </signature>
            if (!allowWhitespace) {
                return !_.isBlank(field.$el.val());
            } else {
                return field.$el.val() !== "";
            }
        },
        "number": function (field) {
            /// <summary>Checks if the field's value is a number.</summary>
            /// <param name="field" type="Validator.Field">The field to be validated.</param>
            /// <returns type="Boolean"></returns>
            return !_.isNaN(+field.$el.val());
        },
        "length": function (field, args) {
            /// <summary>Checks if the field's value is exactly a certain length.</summary>
            /// <param name="field" type="Validator.Field">The field to be validated.</param>
            /// <param name="args" type="Array">An array whose first position is the length to check for.</param>
            /// <returns type="Boolean"></returns>
            /// <syntax>length:7</syntax>
            var val = field.$el.val();
            if (!_.isBlank(val)) {
                return val.length === _.toNumber(args[0]);
            } else {
                return true;
            }
        },
        "min": function (field, args) {
            /// <summary>Checks if the field's value is at least a certain length.</summary>
            /// <param name="field" type="Validator.Field">The field to be validated.</param>
            /// <param name="args" type="Array">An array whose first position is the length to check for.</param>
            /// <returns type="Boolean"></returns>
            /// <syntax>min:5</syntax>
            var val = field.$el.val();
            if (!_.isBlank(val)) {
                return val.length >= _.toNumber(args[0]);
            } else {
                return true;
            }
        },
        "max": function (field, args) {
            /// <summary>Checks if the field's value is at most a certain length.</summary>
            /// <param name="field" type="Validator.Field">The field to be validated.</param>
            /// <param name="args" type="Array">An array whose first position is the length to check for.</param>
            /// <returns type="Boolean"></returns>
            /// <syntax>max:10</syntax>
            return field.$el.val().length <= _.toNumber(args[0]);
        },
        "email": function (field) {
            /// <summary>Checks if the field's value is a valid email address.</summary>
            /// <param name="field" type="Validator.Field">The field to be validated.</param>
            /// <returns type="Boolean"></returns>
            var val = field.$el.val();
            if (!_.isBlank(val)) {
                return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(val);
            } else {
                return true;
            }
        },
        "phone-us": function (field) {
            /// <summary>Checks if the field's value is a valid United States phone number. Allows leading +1.</summary>
            /// <param name="field" type="Validator.Field">The field to be validated.</param>
            /// <returns type="Boolean"></returns>
            var val = field.$el.val();
            if (!_.isBlank(val)) {
                return /^(?:\+?1[-. ]?)?\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/.test(val);
            } else {
                return true;
            }
        },
        "zip-us": function (field) {
            /// <summary>Checks if the field's value is a valid U.S. zip code. Allows trailing dash and 4 digit code.</summary>
            /// <param name="field" type="Validator.Field">The field to be validated.</param>
            /// <returns type="Boolean"></returns>
            var val = field.$el.val();
            if (!_.isBlank(val)) {
                return /^\d{5}(-\d{4})?$/.test(field.$el.val());
            } else {
                return true;
            }
        },
        "zip-ca": function (field) {
            /// <summary>Checks if the field's value is a valid Canadian zip code.</summary>
            /// <param name="field" type="Validator.Field">The field to be validated.</param>
            /// <returns type="Boolean"></returns>
            var val = field.$el.val();
            if (!_.isBlank(val)) {
                return /^[ABCEGHJKLMNPRSTVXY]{1}\d{1}[A-Z]{1} *\d{1}[A-Z]{1}\d{1}$/i.test(val);
            } else {
                return true;
            }
        },
        "zip-us-ca": function (field) {
            /// <summary>Checks if the field's value is a valid U.S. or Canadian zip code. Allows trailing dash and 4 digit code for U.S. zip codes.</summary>
            /// <param name="field" type="Validator.Field">The field to be validated.</param>
            /// <returns type="Boolean"></returns>
            var val = field.$el.val();
            if (!_.isBlank(val)) {
                return /(^\d{5}(-\d{4})?$)|(^[ABCEGHJKLMNPRSTVXY]{1}\d{1}[A-Z]{1} *\d{1}[A-Z]{1}\d{1}$)/.test(val);
            } else {
                return true;
            }
        },
        "checked": function (field) {
            /// <summary>Checks if a radio button or checkbox is checked.</summary>
            /// <param name="field" type="Validator.Field">The field to be validated.</param>
            /// <returns type="Boolean"></returns>
            return field.$el.prop("checked");
        },
        "any-checked": function (field) {
            /// <summary>Checks if any radio button in this radio button's group is checked.</summary>
            /// <param name="field" type="Validator.Field">The field to be validated.</param>
            /// <returns type="Boolean"></returns>
            var name = field.$el.attr("name"),
                result = false;
            _.each($("[name='" + name + "']"), function (v, k) {
                if ($(v).prop("checked")) result = true;
            });
            return result;
        },
		"values": function (field, args) {
            /// <summary>Checks if the field is equal to any of the passed values. Do not encapsulate strings in quotation marks.</summary>
            /// <param name="field" type="Validator.Field">The field to be validated.</param>
            /// <returns type="Boolean"></returns>
            /// <syntax>values:1:2:3:4:5:6:7:all good children go to heaven</syntax>
			var val = field.$el.val();
            if (!_.isBlank(val)) {
                return _.include(args, val);
            } else {
                return true;
            }
		},
        "date": function (field) {
            /// <summary>Checks if the field is a valid date in the format m/d/y, m-d-y</summary>
            /// <param name="field" type="Validator.Field">The field to be validated.</param>
            /// <returns type="Boolean"></returns>
            var val = field.$el.val()
              , parts = _.str.include(val, "/") ? val.split("/") : val.split("-");
            
            if (!_.isBlank(val)) {
                if (parts.length == 3) {
                    var m = parts[0]
                      , d = parts[1]
                      , y = parts[2]
                      , numDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

                    if (!_.isBlank(m) && !_.isNaN(+m) && !_.isBlank(d) && !_.isNaN(+d) && !_.isBlank(y) && !_.isNaN(+y)) {
                        if ((!(y % 4) && y % 100) || !(y % 400))
                            numDays[1] = 29;

                        return d <= numDays[m - 1];
                    }
                }
                return false;
            } else {
                return true
            }

        },
        "time": function (field) {
            /// <summary>Checks if the field is a valid time in the format hh:mm[:ss][am/pm]</summary>
            /// <param name="field" type="Validator.Field">The field to be validated.</param>
            /// <returns type="Boolean"></returns>
            var val = field.$el.val().toLowerCase()
              , parts = val.split(":")
              , timeIndicator = (_.endsWith(val, "am") ||  _.endsWith(val, "pm")) ? val.slice(-2) : ""
              , hourTopLimit, hourBottomLimit;

            if (!_.isBlank(val)) {
                if (timeIndicator == "am" || timeIndicator == "pm") {
                    parts[parts.length - 1] = parts[parts.length - 1].slice(0, parts[parts.length - 1].length - 2);
                    hourTopLimit = 12;
                    hourBottomLimit = 1;
                } else {
                    hourTopLimit = 23;
                    hourBottomLimit = 0;
                }

                if (/^(\d{1,2}):(\d{2})(:\d{2})?([ap]m)?$/.test(val)) {
                    for (var i = 0; i < parts.length; i++) {
                        if (i == 0) {
                            if (!(parts[0] >= hourBottomLimit && parts[0] <= hourTopLimit)) {
                                return false;
                            }
                        }
                        if (i == 1 || i == 2) {
                            if (!(parts[i] >= 0 && parts[i] <= 59)) {
                                return false;
                            }
                        }
                    }
                    return true;
                } else {
                    return false;
                }
            } else {
                return true;
            }
        },
		"creditcard": function (field) {
			/// <summary>Checks that the credit card is valid</summary>
            /// <param name="field" type="Validator.Field">The field to be validated.</param>
            /// <returns type="Boolean"></returns>
            var val = field.$el.val();
            var vals = val.split("");
            
            if (!_.isBlank(val)) {
                if (Validator.Tests["number"](field)) {

                    for (var i = vals.length - 2; i >= 0; i-=2) {
                        vals[i] = (vals[i] * 2).toString().split("");
                    }

                    vals = _.flatten(vals);

                    if (!(_.reduce(vals, function (memo, num) { return memo + (+num); }, 0) % 10)) {
                        var mcAmexPrefix = +val.slice(0, 2), visaPrefix = +val.slice(0, 1), discoverPrefix = +val.slice(0, 4);
                        var cardType = "";

                        if (mcAmexPrefix >= 51 && mcAmexPrefix <= 55 && val.length == 16) {
                            cardType = "mastercard";
                        } else if ((mcAmexPrefix == 34 || mcAmexPrefix == 37) && val.length == 15) {
                            cardType = "amex";
                        } else if (visaPrefix == 4 && (val.length == 13 || val.length == 16)) {
                            cardType = "visa";
                        } else if (discoverPrefix == 6011 && val.length == 16) {
                            cardType = "discover";
                        }

                        return cardType;
                    }
                }

                return false;
            } else {
                return true;
            }
		}
    };

    Validator.Field = function (config) {
        /// <summary>Creates a new Validator.Field object.</summary>
        /// <param name="config" type="Object">The field configuration.</param>
        /// <returns type="Validator.Field"></returns>
        this.name = config.name;
        this.el = (config.$el && !config.el) ? config.$el[0] : config.el;
        this.$el = (config.el && !config.$el) ? $(config.el) : config.$el;
        this.$els = (this.$el.length > 1 ? this.$el : null);
        this.tests = config.tests !== undefined ? config.tests.split(", ") : "";
        this.pretest = config.pretest;
        this.blurCount = 0;
        this.label = (config.$label && !config.label) ? config.$label[0] : config.label;
        this.$label = (config.label && !config.$label) ? $(config.label) : config.$label;

        if (!this.$label) { this.$label = this.$el.closest(".control-group").find("label").eq(0); }

        this.$el.data("vField", this);

        return this;
    };

    Validator.Button = function (config) {
        /// <summary>Creates a new Validator.Button object.</summary>
        /// <param name="config" type="Object">The button configuration.</param>
        /// <returns type="Validator.Button"></returns>
        this.type = config.type;
        this.async = config.async || false;
        this.el = (config.$el && !config.el) ? config.$el[0] : config.el;
        this.$el = (config.el && !config.$el) ? $(config.el) : config.$el;
        this.success = config.success || function () {};
        this.fail = config.fail || function () {};
		this.always = config.always || function () {};

        this.$el.data("vButton", this);

        return this;
    };
	
	Validator.ButtonType = {
		SUBMIT: "submit",
		CLEAR: "clear"
	};

    Validator.Result = function (field, passed, failedTest) {
        /// <signature>
        ///     <summary>Creates a new Validator.Result object.</summary>
        ///     <param name="field" type="Validator.Field">The field that was validated.</param>
        ///     <param name="passed" type="Boolean">Whether or not the validation was successful.</param>
        ///     <returns type="Validator.Result"></returns>
        /// </signature>
        /// <signature>
        ///     <summary>Creates a new Validator.Result object.</summary>
        ///     <param name="field" type="Validator.Field">The field that was validated.</param>
        ///     <param name="passed" type="Boolean">Whether or not the validation was successful.</param>
        ///     <param name="failedTest" type="String">A string representing the failed test. Generally undefined if 'passed' is true.</param>
        ///     <returns type="Validator.Result"></returns>
        /// </signature>

        this.field = field;
        this.passed = passed;
        this.failedTest = failedTest;
    };

    Validator.Form = function (fields, formAdditions) {
        /// <signature>
        ///     <summary>Creates a new Validator.Form object in the format { FieldName: FieldValue } from the specified fields during initialization.</summary>
        ///     <param name="fields" type="Validator.Field[]">An array of Validator.Field objects.</param>
        ///     <returns type="Validator.Form"></returns>
        /// </signature>
        /// <signature>
        ///     <summary>Creates a new Validator.Form object in the format { FieldName: FieldValue } from the specified fields during initialization. Optionally specify 'formAdditions' to add fields to the returned object.</summary>
        ///     <param name="fields" type="Validator.Field[]">An array of Validator.Field objects.</param>
        ///     <param name="formAdditions" type="Object">Fields to add to the returned object, in the format { FieldName: FieldValue }. FieldValue may be also be a function returning the desired value.</param>
        ///     <returns type="Validator.Form"></returns>
        /// </signature>
        var form = {};

        _.each(fields, function (v) {
            if (!v.$els) {
                var elType = v.$el.attr("type");
                if (elType == "radio" || elType == "checkbox") {
                    form[v.name] = v.$el.prop("checked");
                } else {
                    form[v.name] = v.$el.val();
                }
            } else {
                form[v.name] = _.map(v.$els, function (el) { 
                    var $el = $(el), elType = $el.attr("type");
                    if (elType == "radio" || elType == "checkbox") {
                        return $el.prop("checked");
                    } else {
                        return $el.val(); 
                    }
                });
            }
        });

        var additions = {};

        if (formAdditions !== undefined) {
            _.each(formAdditions, function (v, k) {
                if (_.isFunction(v)) {
                    additions[k] = v();
                } else {
                    additions[k] = v;
                }
            });

            _.extend(form, additions);
        }

        return form;
    };
}).call(this);