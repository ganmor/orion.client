/******************************************************************************* 
 * Copyright (c) 2011 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation 
 ******************************************************************************/

/*jslint laxbreak:true regexp:false*/
/*global define eclipse */

define(["dojo", "orion/assert", "orion/textview/textView", "orion/editor/textMateStyler", "testGrammars"],
		function(dojo, assert, mTextView, mTextMateStyler, mTestGrammars) {
	var tests = {};
	
	// TODO: run tests with both Windows and Linux delimiters since a few cases have failed with
	// one but not the other
	var NL = "\r\n";//new eclipse.TextModel().getLineDelimiter();
	
	/**
	 * @param {Function(textView)} testBody
	 * @param {Boolean} [doTearDown]
	 */
	function makeTest(testBody, doTearDown) {
		function createTextView() {
			var options = {parent: "editorDiv", readonly: true, stylesheet: ["test.css"]};
			return new mTextView.TextView(options);
		}
		
		/** Called after each test to remove view from DOM */
		function tearDown(view) {
			if (view) { view.destroy(); }
		}
		
		doTearDown = typeof(doTearDown) === "undefined" ? true : doTearDown;
		if (typeof(testBody) !== "function") { throw new Error("testBody must be a function"); }
		return function() {
			var view;
			try {
				view = createTextView();
				testBody(view);
			} finally {
				if (doTearDown) {
					tearDown(view);
				}
			}
		};
	}
	
	/** Sets the given lines as the view text */
	function setLines(view, /**String[] or varargs*/ lines) {
		if (typeof(lines) === "string") {
			lines = Array.prototype.slice.call(arguments, 1);
		}
		view.setText(lines.join(NL));
	}
	
	/** Does a setText() on the range [col1,col2) in the given line. */
	function changeLine(view, text, lineIndex, col1, col2) {
		var lineStart = view.getModel().getLineStart(lineIndex);
		view.setText(text, lineStart+col1, lineStart+col2);
	}
	
	function arraysEqual(a, b, sameOrder) {
		if (a.length !== b.length) { return false; }
		for (var i=0; i < a.length; i++) {
			var item = a[i];
			var j = b.indexOf(item);
			if (j === -1 || (sameOrder && i !== j)) { return false; }		}
		return true;
	}
	
	function scope2Classes(/**String*/ scope) {
		return scope.split(".").map(function(seg, i, segs) {
				return segs.slice(0, i+1).join("-");
			});
	}

	/** @returns true if style corresponds exactly to the given scope. */
	function styleMatchesScope(/**eclipse.Style*/ style, /**String*/ scope) {
		var classes = style.styleClass.split(/\s+/);
		return arraysEqual(classes, scope2Classes(scope)); 
	}
	
	/**
	 * Fails if the {@link eclipse.StyleRange[]} ranges returned by running the styler on the line number
	 * <tt>lineIndex</tt> do not exactly match the expected result given in <tt>scopeRegions</tt>.
	 * @param {Array} scopeRegions Each element of scopeRegions is an Array with the elements:
	 *   [{Number} start, {Number} end, {String} scope, {String} text?]
	 *  where start and end are line-relative indices, and the last element (text) is optional.
	 */
	function assertLineScope(view, styler, lineIndex, scopeRegions) {
		var lineText = view.getModel().getLine(lineIndex);
		var lineStart = view.getModel().getLineStart(lineIndex);
		var lineEnd = view.getModel().getLineEnd(lineIndex);
		var lineStyleEvent = {lineIndex: lineIndex, lineText: lineText, lineStart: lineStart, lineEnd: lineEnd};
		view.onLineStyle(lineStyleEvent);
		
		var styleRanges = lineStyleEvent.ranges;
		assert.ok(styleRanges !== null && styleRanges !== undefined, true, "lineStyleEvent.ranges exists");
		assert.equal(styleRanges.length, scopeRegions.length, "Line " + lineIndex + ": Number of styled regions matches");
		var ok, last;
		ok = dojo.every(scopeRegions, function(scopeRegion) {
				return dojo.some(styleRanges, function(styleRange) {
					var start = scopeRegion[0],
					    end = scopeRegion[1],
					    scope = scopeRegion[2],
					    text = scopeRegion[3];
					last = "start=" + start + " end=" + end + " scope=" + scope + (typeof(text) === "string" ? " text=" + text : "");
					return (styleRange.start === lineStart + start
						&& styleRange.end === lineStart + end
						&& styleMatchesScope(styleRange.style, scope)
						&& (typeof(text) !== "string" || text === view.getText(styleRange.start, styleRange.end)));
				});
			});
		
		var rangeStrs = dojo.map(lineStyleEvent.ranges, function(styleRange) {
				var start = styleRange.start - lineStart,
				    end = styleRange.end - lineStart,
				    nicerScope = styleRange.style.styleClass.split(" ").pop().replace(/-/g, "."); // make easier to read
				return "{start:" + start + ", end:" + end + ", scope:" + nicerScope + "}";
			});
		assert.ok(ok, "No StyleRange in Line " + lineIndex + " matched expected {" + last + "}. StyleRanges were [" + rangeStrs.join(",") + "]");
	}
	
	function assertDoesntHaveProps(obj /*, propNames..*/) {
		var propNames = Array.prototype.slice.call(arguments, 1);
		for (var i=0; i < propNames.length; i++) {
			assert.ok(!obj.hasOwnProperty(propNames[i]));
		}
	}
	
	function assertHasProps(obj /*, propNames..*/) {
		var propNames = Array.prototype.slice.call(arguments, 1);
		for (var i=0; i < propNames.length; i++) {
			assert.ok(obj.hasOwnProperty(propNames[i]));
		}
	}
	
	
	
	
	
	
	// ************************************************************************************************
	// Test supporting util methods
	
	tests["test TextMateStyler - Util.groupify()"] = function() {
		var result1 = mTextMateStyler.Util.groupify(new RegExp("")),
		    regex1 = result1[0];
		assert.equal(regex1.source, "");
		
		var result2 = mTextMateStyler.Util.groupify(/()/),
		    regex2 = result2[0], 
		    map2 = result2[1],
		    con2 = result2[2];
		assert.equal(regex2.source, "()");
		assert.equal(map2[1], 1);
		assertHasProps(con2, "1");
		
		var result3 = mTextMateStyler.Util.groupify(/a+/),
		    regex3 = result3[0],
		    map3 = result3[1],
		    con3 = result3[2];
		assert.equal(regex3.source, "(a+)");
		assertDoesntHaveProps(map3, "1");
		assertHasProps(con3, "1");
		
		var result4 = mTextMateStyler.Util.groupify(/x(a+)b?/),
		    regex4 = result4[0],
		    map4 = result4[1],
		    con4 = result4[2];
		assert.equal(regex4.source, "(x)(a+)(b?)");
		assert.equal(map4[1], 2);
		assertDoesntHaveProps(map4, "2");
		assertHasProps(con4, "1");
		
		var result5 = mTextMateStyler.Util.groupify(/a+(?=b)c+(?!d*x?y)e+/),
		    regex5 = result5[0],
		    map5 = result5[1],
		    con5 = result5[2];
		assert.equal(regex5.source, "(a+)(?=b)(c+)(?!d*x?y)(e+)");
		assertDoesntHaveProps(map5, "1");
		assertHasProps(con5, "1", "2", "3");
		
		// Non-capturing group
		var result6 = mTextMateStyler.Util.groupify(/(?:x+(a+)(b+))(c+)/),
		    regex6 = result6[0],
		    map6 = result6[1],
		    con6 = result6[2];
		assert.equal(regex6.source, "(?:(x+)(a+)(b+))(c+)");
		assert.equal(map6[1], 2);
		assert.equal(map6[2], 3);
		assert.equal(map6[3], 4);
		assertHasProps(con6, "1", "2", "3", "4");
		
		// Capturing group inside a lookahead
		var result7 = mTextMateStyler.Util.groupify(/x+(?=aa(b+))z{2,}/),
		    regex7 = result7[0],
		    map7 = result7[1],
		    con7= result7[2];
		assert.equal(regex7.source, "(x+)(?=aa(b+))(z{2,})");
		assert.equal(map7[1], "2"); // (b+)
		assertHasProps(con7, "1", "3"); // (b+) is group 2, and it's NOT consuming
		
		// Escaping \( and \)
		var result8 = mTextMateStyler.Util.groupify(new RegExp(/aa(\(x\))bb|[^cd]/)),
		    regex8 = result8[0],
		    map8 = result8[1],
		    con8 = result8[2];
		assert.equal(regex8.source, "(aa)(\\(x\\))(bb|[^cd])");
		assert.equal(map8[1], "2"); // (\(x\))
		assertHasProps(con8, "1", "2", "3");
		
		// Escaping \
		var result9 = mTextMateStyler.Util.groupify(/C:\\(\w+)\\/),
		    regex9 = result9[0],
		    map9 = result9[1],
		    con9 = result9[2];
		assert.equal(regex9.source, /(C:\\)(\w+)(\\)/.source);
		assert.equal(map9[1], "2"); // (\w+)
		assertHasProps(con9, "1", "2", "3");
		
		// Backrefs
		var result10 = mTextMateStyler.Util.groupify(/x?(a+)x\1x?/),
		    regex10 = result10[0],
		    map10 = result10[1],
		    con10 = result10[2];
		assert.equal(regex10.source, "(x?)(a+)(x\\2x?)");
		assert.equal(map10[1], "2");
		assertHasProps(con10, "1", "2", "3");
		
		// Backrefs with the false parameter (should not be touched)
		var result11 = mTextMateStyler.Util.groupify(/(x+)(y+)(z+)\2/),
		    regex11 = result11[0],
		    map11 = result11[1],
		    con11 = result11[2];
		assert.equal(regex11.source, "(x+)(y+)(z+)(\\2)");
		assert.equal(map11[1], "1");
		assert.equal(map11[2], "2");
		assert.equal(map11[3], "3");
		assertHasProps(con11, "1", "2", "3");
	};
	
	// ************************************************************************************************
	// Test creation
	
	tests["test TextMateStyler - create"] = makeTest(function(view) {
		try {
			var styler = new mTextMateStyler.TextMateStyler(view, mTestGrammars.SampleGrammar);
			assert.ok(true, "true is false");
		} catch (e) {
			assert.ok(false, "Exception creating view");
		}
	});
	
	// ************************************************************************************************
	// Test initial styling of buffer
	
	tests["test TextMateStyler - initial - style one line"] = makeTest(function(view) {
		var styler = new mTextMateStyler.TextMateStyler(view, mTestGrammars.SampleGrammar);
		view.setText("fizzer");
		
		// expect fi[z][z]er
		var invalidScopeName = mTestGrammars.SampleGrammar.repository.badZ.name;
		assertLineScope(view, styler, 0, [
				[2, 3, invalidScopeName], // z
				[3, 4, invalidScopeName]  // z
			]);
	});
	
	tests["test TextMateStyler - initial - style multiple lines"] = makeTest(function(view) {
		var styler = new mTextMateStyler.TextMateStyler(view, mTestGrammars.SampleGrammar);
		var line0Text = "no_important_stuff_here",
		    line1Text = "    this    var    &&";
		setLines(view, [line0Text, line1Text]);
		
		assertLineScope(view, styler, 0, []);
		assertLineScope(view, styler, 1, [
			[4, 8, "keyword.other.mylang"],				// this
			[12, 15, "keyword.other.mylang"],			// var
			[19, 21, "keyword.operator.logical.mylang"]	// &&
		]);
	});
	
	// test begin/end on single input line
	tests["test TextMateStyler - initial - begin/end single line - subrule"] = makeTest(function(view) {
		var styler = new mTextMateStyler.TextMateStyler(view, mTestGrammars.SampleBeginEndGrammar);
		var lines;
		
		// test subrule invalid.illegal.badcomment.mylang applied to "--"
		lines = [ "<!--a--a-->" ];
		setLines(view, lines);
		assertLineScope(view, styler, 0, [
			[0, 4, "punctuation.definition.comment.mylang"], // <!--
			[4, 5, "comment.block.mylang"], // a
			[5, 7, "invalid.illegal.badcomment.mylang"], // --
			[7, 8, "comment.block.mylang"], // a
			[8, 11, "punctuation.definition.comment.mylang"] // -->
		]);
	});
	
	tests["test TextMateStyler - initial - begin/end 1 line - subrule exited"] = makeTest(function(view) {
		var styler = new mTextMateStyler.TextMateStyler(view, mTestGrammars.SampleBeginEndGrammar);
		var lines;
		
		// Test that the rule assigning -- to "invalid.illegal.badcomment.mylang" only takes effect
		// inside the <!-- --> block and not outside it
		lines = [ "-- <!--a--b--> --" ];
		setLines(view, lines);
		assertLineScope(view, styler, 0, [
			[3, 7, "punctuation.definition.comment.mylang"], // <!--
			[7, 8, "comment.block.mylang"], // a
			[8, 10, "invalid.illegal.badcomment.mylang"], // --
			[10, 11, "comment.block.mylang"], // b
			[11, 14, "punctuation.definition.comment.mylang"] // -->
		]);
	});
	
	tests["test TextMateStyler - initial - begin/end single line - name"] = makeTest(function(view) {
		var styler = new mTextMateStyler.TextMateStyler(view, mTestGrammars.SampleBeginEndGrammar);
		var lines;
		
		// test that "name" of begin/end rule is applied to text between the delimiters
		lines = [ "<!--aaaaaa-->" ];
		setLines(view, lines);
		assertLineScope(view, styler, 0, [
			[0, 4,   "punctuation.definition.comment.mylang"], // <!--
			[4, 10,  "comment.block.mylang"], // aaaaaa
			[10, 13, "punctuation.definition.comment.mylang"] // -->
		]);
	});
	
	tests["test TextMateStyler - initial - begin/end 2 lines - just delimiters"] = makeTest(function(view) {
		var styler = new mTextMateStyler.TextMateStyler(view, mTestGrammars.SampleBeginEndGrammar);
		var lines;
		lines = [
			"<!--",
			"-->"
		];
		setLines(view, lines);
		assertLineScope(view, styler, 0, [ [0, 4, "punctuation.definition.comment.mylang"] ]); // <!--
		assertLineScope(view, styler, 1, [ [0, 3, "punctuation.definition.comment.mylang"] ]); // -->
	});
	
	
	tests["test TextMateStyler - initial - begin/end 2 lines - with content"] = makeTest(function(view) {
		var styler = new mTextMateStyler.TextMateStyler(view, mTestGrammars.SampleBeginEndGrammar);
		var lines;
		lines = [
			"<!--a",
			"b-->"
		];
		setLines(view, lines);
		assertLineScope(view, styler, 0, [
			[0, 4, "punctuation.definition.comment.mylang"], // <!--
			[4, 5, "comment.block.mylang"]  // a
		]);
		assertLineScope(view, styler, 1, [
			[0, 1, "comment.block.mylang"], // b
			[1, 4, "punctuation.definition.comment.mylang"] // -->
		]);
	});

	tests["test TextMateStyler - initial - begin/end 3 lines - with leading/trailing content"] = makeTest(function(view) {
		var styler = new mTextMateStyler.TextMateStyler(view, mTestGrammars.SampleBeginEndGrammar);
		var lines;
		lines = [
			"a<!--c",
			"commentc",
			"omment-->bb"
		];
		setLines(view, lines);
		assertLineScope(view, styler, 0, [
			[1, 5, "punctuation.definition.comment.mylang"], // <!--
			[5, 6, "comment.block.mylang"] // c
		]);
		assertLineScope(view, styler, 1, [
			[0, 8, "comment.block.mylang"] // commentc
		]);
		assertLineScope(view, styler, 2, [
			[0, 6, "comment.block.mylang"], // omment
			[6, 9, "punctuation.definition.comment.mylang"] // -->
		]);
	});
	
	tests["test TextMateStyler - initial - b/e region inside b/e region"] = makeTest(function(view) {
		var styler = new mTextMateStyler.TextMateStyler(view, mTestGrammars.SampleBeginEndGrammar);
		var lines;
		lines = [
			"<!--[]-->",
			"<!--[  ]-->",
			"<!--[ a ]-->",
			"<!--[   ",
			"b b"
		];
		setLines(view, lines);
		assertLineScope(view, styler, 0, [
			[0, 4, "punctuation.definition.comment.mylang", "<!--"],
			[4, 5, "meta.brace.square.open.mylang", "["],
			[5, 6, "meta.brace.square.close.mylang", "]"],
			[6, 9, "punctuation.definition.comment.mylang", "-->"]
		]);
		assertLineScope(view, styler, 1, [
			[0, 4, "punctuation.definition.comment.mylang", "<!--"],
			[4, 5, "meta.brace.square.open.mylang", "["],
			[5, 7, "invalid.illegal.whitespace.mylang", "  "],
			[7, 8, "meta.brace.square.close.mylang", "]"],
			[8, 11, "punctuation.definition.comment.mylang", "-->"]
		]);
		assertLineScope(view, styler, 2, [
			[0, 4, "punctuation.definition.comment.mylang", "<!--"],
			[4, 5, "meta.brace.square.open.mylang", "["],
			[5, 6, "invalid.illegal.whitespace.mylang", " "],
			[6, 7, "meta.insquare.mylang", "a"],
			[7, 8, "invalid.illegal.whitespace.mylang", " "],
			[8, 9, "meta.brace.square.close.mylang", "]"],
			[9, 12, "punctuation.definition.comment.mylang", "-->"]
		]);
		assertLineScope(view, styler, 3, [
			[0, 4, "punctuation.definition.comment.mylang", "<!--"],
			[4, 5, "meta.brace.square.open.mylang", "["],
			[5, 8, "invalid.illegal.whitespace.mylang", "   "]
		]);
		assertLineScope(view, styler, 4, [
			[0, 1, "meta.insquare.mylang", "b"],
			[1, 2, "invalid.illegal.whitespace.mylang", " "],
			[2, 3, "meta.insquare.mylang", "b"]
		]);
	});
	
	// Test for Bug 347486, ensure we try all subrules on each line
	tests["test TextMateStyler - initial - all subrules are tried"] = makeTest(function(view) {
		var styler = new mTextMateStyler.TextMateStyler(view, mTestGrammars.SampleGrammar);
		var lines = [
			'break var "foo" null 123',
			"z if"
		];
		setLines(view, lines);
		assertLineScope(view, styler, 0, [
			[0, 5, "keyword.control.mylang", "break"],
			[6, 9, "keyword.other.mylang", "var"],
			[10, 15, "constant.character.mylang", '"foo"'],
			[16, 20, "constant.language.mylang", "null"],
			[21, 24, "constant.numeric.mylang", "123"]
		]);
		assertLineScope(view, styler, 1, [
			[0, 1, "invalid.illegal.idontlikez.mylang", "z"],
			[2, 4, "keyword.control.mylang", "if"]
		]);
	});
	
	tests["test TextMateStyler - scope to non-0 capturing groups"] = makeTest(function(view) {
		var styler = new mTextMateStyler.TextMateStyler(view, mTestGrammars.ComplexCaptures);
		setLines(view, [
			"function (arg1, arg2)",
			"aafunction () bb",
			"nothinghere"
		]);
		assertLineScope(view, styler, 0, [
			[0, 8, "keyword.function", "function"],
			[9, 21, "meta.arglist.function", "(arg1, arg2)"]
		]);
		assertLineScope(view, styler, 1, [
			[2, 10, "keyword.function", "function"],
			[11, 13, "meta.arglist.function", "()"]
		]);
		assertLineScope(view, styler, 2, [
		]);
	});
	
	tests["test TextMateStyler - scope to non-0 capturing groups with end-to-begin backrefs"] = makeTest(function(view) {
		var styler = new mTextMateStyler.TextMateStyler(view, mTestGrammars.ComplexCaptures);
		setLines(view, [
			"[foo]bar[/foo]",
			"[a][b][/b][/a]"
		]);
		assertLineScope(view, styler, 0, [
			// [foo]
			[0, 1, "punctuation.definition.tag.opener", "["],
			[1, 4, "entity.tag.open.name", "foo"],
			[4, 5, "punctuation.definition.tag.closer", "]"],
			// [/foo]
			[8, 9, "punctuation.definition.tag.opener", "["],
			[10, 13, "entity.tag.close.name", "foo"],
			[13, 14, "punctuation.definition.tag.closer", "]"]
		]);
		assertLineScope(view, styler, 1, [
			// [a]
			[0, 1, "punctuation.definition.tag.opener", "["],
			[1, 2, "entity.tag.open.name", "a"],
			[2, 3, "punctuation.definition.tag.closer", "]"],
			// [b]
			[3, 4, "punctuation.definition.tag.opener", "["],
			[4, 5, "entity.tag.open.name", "b"],
			[5, 6, "punctuation.definition.tag.closer", "]"],
			[6, 7, "punctuation.definition.tag.opener", "["],
			// [/b]
			[8, 9, "entity.tag.close.name", "b"],
			[9, 10, "punctuation.definition.tag.closer", "]"],
			[10, 11, "punctuation.definition.tag.opener", "["],
			// [/a]
			[12, 13, "entity.tag.close.name", "a"],
			[13, 14, "punctuation.definition.tag.closer", "]"]
		]);
	});
	
	tests["test TextMateStyler - scope to non-0 capturing groups with gaps between them"] = makeTest(function(view) {
		var styler = new mTextMateStyler.TextMateStyler(view, mTestGrammars.ComplexCaptures);
		setLines(view, [
			"xxxaaxxxbbb"
		]);
		assertLineScope(view, styler, 0, [
			[3, 5, "meta.a", "aa"],
			[8, 11, "keyword.b", "bbb"]
		]);
	});
	
	// ************************************************************************************************
	// Test damage/repair styling
	
	tests["test TextMateStyler - change - inside region"] = makeTest(function(view) {
		var styler = new mTextMateStyler.TextMateStyler(view, mTestGrammars.SampleBeginEndGrammar);
		var lines;
		lines = [
			"<!--",
			"a",
			"-->"
		];
		setLines(view, lines);
		assertLineScope(view, styler, 0, [ [0, 4, "punctuation.definition.comment.mylang", "<!--"] ]);
		assertLineScope(view, styler, 1, [ [0, 1, "comment.block.mylang", "a"] ]);
		assertLineScope(view, styler, 2, [ [0, 3, "punctuation.definition.comment.mylang", "-->"] ]);
		
		/*
		<!--
		axxxx
		-->
		*/
		changeLine(view, "xxxx", 1, 1, 1); // insert xxxx after a on line 1
		assertLineScope(view, styler, 0, [
			[0, 4, "punctuation.definition.comment.mylang"] // <!--
		]);
		assertLineScope(view, styler, 1, [
			[0, 5, "comment.block.mylang"] // axxxx
		]);
		assertLineScope(view, styler, 2, [
			[0, 3, "punctuation.definition.comment.mylang"] // -->
		]);
	}, false);
	
	tests["test TextMateStyler - change - add non-region text that follows region"] = makeTest(function(view) {
		var styler = new mTextMateStyler.TextMateStyler(view, mTestGrammars.SampleBeginEndGrammar);
		var lines;
		lines = [
			"<!--",
			"a",
			"-->"
		];
		setLines(view, lines);
		
		changeLine(view, "char", 2, 3, 3);
		/*
		<!--
		a
		-->char
		*/
		assertLineScope(view, styler, 0, [
			[0, 4, "punctuation.definition.comment.mylang"] // <!--
		]);
		assertLineScope(view, styler, 1, [
			[0, 1, "comment.block.mylang"] // a
		]);
		assertLineScope(view, styler, 2, [
			[0, 3, "punctuation.definition.comment.mylang"], // -->
			[3, 7, "storage.type.mylang"] // char
		]);
	});
	
	tests["test TextMateStyler - change - add non-region text that precedes region"] = makeTest(function(view) {
		var styler = new mTextMateStyler.TextMateStyler(view, mTestGrammars.SampleBeginEndGrammar);
		var lines;
		lines = [
			"<!--",
			"a",
			"-->int"
		];
		setLines(view, lines);
		
		changeLine(view, "char", 0, 0, 0);
		/*
		char<!--
		a
		-->
		*/
		assertLineScope(view, styler, 0, [
			[0, 4, "storage.type.mylang", "char"],
			[4, 8, "punctuation.definition.comment.mylang", "<!--"]
		]);
		assertLineScope(view, styler, 1, [
			[0, 1, "comment.block.mylang", "a"]
		]);
		assertLineScope(view, styler, 2, [
			[0, 3, "punctuation.definition.comment.mylang", "-->"],
			[3, 6, "storage.type.mylang", "int"]
		]);
	});
	
	// add non-region text between regions
	tests["test TextMateStyler - change - add non-region text between regions"] = makeTest(function(view) {
		var styler = new mTextMateStyler.TextMateStyler(view, mTestGrammars.SampleBeginEndGrammar);
		setLines(view, [
			"<!--aaa-->",
			"<!--bbb-->"
		]);
		changeLine(view, "int xxx char", 0, 10, 10);
		/*
		<!--aaa-->int xxx char
		<!--bbb-->
		*/
		assertLineScope(view, styler, 0, [
			[0, 4, "punctuation.definition.comment.mylang", "<!--"],
			[4, 7, "comment.block.mylang", "aaa"],
			[7, 10, "punctuation.definition.comment.mylang", "-->"],
			[10, 13, "storage.type.mylang", "int"],
			// xxx is ignored: doesn't match anything
			[18, 22, "storage.type.mylang", "char"]
		]);
		assertLineScope(view, styler, 1, [
			[0, 4, "punctuation.definition.comment.mylang", "<!--"],
			[4, 7, "comment.block.mylang", "bbb"],
			[7, 10, "punctuation.definition.comment.mylang", "-->"]
		]);
	});

	// creates a new region by adding the start block
	tests["test TextMateStyler - change - add 'start' 1"] = makeTest(function(view) {
		var styler = new mTextMateStyler.TextMateStyler(view, mTestGrammars.SampleBeginEndGrammar);
		setLines(view, [
			"a",
			"-->"
		]);
		
		/*
		char<!--a
		-->
		*/
		changeLine(view, "char<!--", 0, 0, 0);
		assertLineScope(view, styler, 0, [
			[0, 4, "storage.type.mylang", "char"],
			[4, 8, "punctuation.definition.comment.mylang", "<!--"],
			[8, 9, "comment.block.mylang", "a"]
		]);
		assertLineScope(view, styler, 1, [
			[0, 3, "punctuation.definition.comment.mylang", "-->"]
		]);
	});
	
	// creates a new region by adding the start block
	tests["test TextMateStyler - change - add 'start' 2"] = makeTest(function(view) {
		var styler = new mTextMateStyler.TextMateStyler(view, mTestGrammars.SampleBeginEndGrammar);
		setLines(view, [
			"xxxx<!--a",
			"-->"
		]);
		assertLineScope(view, styler, 0, [
			[4, 8, "punctuation.definition.comment.mylang", "<!--"],
			[8, 9, "comment.block.mylang", "a"]
		]);
		assertLineScope(view, styler, 1, [
			[0, 3, "punctuation.definition.comment.mylang", "-->"]
		]);
		
		// Add another start that knocks out the earlier one
		/*
		<!--xxxx<!--a
		-->
		*/
		changeLine(view, "<!--", 0, 0, 0);
		assertLineScope(view, styler, 0, [
			[0, 4, "punctuation.definition.comment.mylang", "<!--"],
			[4, 10, "comment.block.mylang", "xxxx<!"],
			[10, 12, "invalid.illegal.badcomment.mylang", "--"],
			[12, 13, "comment.block.mylang", "a"]
		]);
		assertLineScope(view, styler, 1, [
			[0, 3, "punctuation.definition.comment.mylang", "-->"]
		]);
		
		// Add another line just to make sure
		/*
		<!--xxxx<!--a
		b
		-->
		*/
		changeLine(view, NL + "b", 0, 13, 13);
		assertLineScope(view, styler, 0, [
			[0, 4, "punctuation.definition.comment.mylang", "<!--"],
			[4, 10, "comment.block.mylang", "xxxx<!"],
			[10, 12, "invalid.illegal.badcomment.mylang", "--"],
			[12, 13, "comment.block.mylang", "a"]
		]);
		assertLineScope(view, styler, 1, [
			[0, 1, "comment.block.mylang", "b"]
		]);
		assertLineScope(view, styler, 2, [
			[0, 3, "punctuation.definition.comment.mylang", "-->"]
		]);
	});
	
	// Creates a new region at eof. New region never matches its end (ie. extends until eof)
	tests["test TextMateStyler - change - add 'start' at eof, no 'end'"] = makeTest(function(view) {
		var styler = new mTextMateStyler.TextMateStyler(view, mTestGrammars.SampleBeginEndGrammar);
		setLines(view, [
			"<!--a-->"
		]);
		
		/*
		<!--a--><!--
		*/
		changeLine(view, "<!--", 0, 8, 8);
		assertLineScope(view, styler, 0, [
			[0, 4, "punctuation.definition.comment.mylang", "<!--"],
			[4, 5, "comment.block.mylang", "a"],
			[5, 8, "punctuation.definition.comment.mylang", "-->"],
			[8, 12, "punctuation.definition.comment.mylang", "<!--"]
		]);
		
		/*
		<!--a--><!--b
		*/
		changeLine(view, "b", 0, 12, 12);
		assertLineScope(view, styler, 0, [
			[0, 4, "punctuation.definition.comment.mylang", "<!--"],
			[4, 5, "comment.block.mylang", "a"],
			[5, 8, "punctuation.definition.comment.mylang", "-->"],
			[8, 12, "punctuation.definition.comment.mylang", "<!--"],
			[12, 13, "comment.block.mylang", "b"]
		]);
		
		/*
		<!--a--><!--b-->x
		*/
		changeLine(view, "-->x", 0, 13, 13);
		assertLineScope(view, styler, 0, [
			[0, 4, "punctuation.definition.comment.mylang", "<!--"],
			[4, 5, "comment.block.mylang", "a"],
			[5, 8, "punctuation.definition.comment.mylang", "-->"],
			[8, 12, "punctuation.definition.comment.mylang", "<!--"],
			[12, 13, "comment.block.mylang", "b"],
			[13, 16, "punctuation.definition.comment.mylang", "-->"]
			// x is ignored
		]);
	});
	
	tests["test TextMateStyler - change - add 'start' at eof on new line incr"] = makeTest(function(view) {
		var styler = new mTextMateStyler.TextMateStyler(view, mTestGrammars.SampleBeginEndGrammar);
		setLines(view, [
			"<!--a-->"
		], NL);
		// Helper since line 0's scope doesn't change in this test
		function assertLine0Scope() {
			assertLineScope(view, styler, 0, [
				[0, 4, "punctuation.definition.comment.mylang", "<!--"],
				[4, 5, "comment.block.mylang", "a"],
				[5, 8, "punctuation.definition.comment.mylang", "-->"]
			]);
		}
		
		// Add the newline first
		/*
		<!--a-->
		
		*/
		changeLine(view, NL, 0, 8, 8);
		assertLine0Scope();
		assertLineScope(view, styler, 1, [
			// empty line
		]);
		
		// Now add the start INCREMENTALLY
		/*
		<!--a-->
		<
		*/
		changeLine(view, "<", 1, 0, 0);
		assertLine0Scope();
		assertLineScope(view, styler, 1, [ /* no scope on line 1 */ ]);
		
		/*
		<!--a-->
		<!
		*/
		changeLine(view, "!", 1, 1, 1);
		assertLine0Scope();
		assertLineScope(view, styler, 1, [ /* no scope on line 1 */ ]);
		
		/*
		<!--a-->
		<!-
		*/
		changeLine(view, "-", 1, 2, 2);
		assertLine0Scope();
		assertLineScope(view, styler, 1, [ /* no scope on line 1 */ ]);
				/*
		<!--a-->
		<!--
		*/
		changeLine(view, "-", 1, 3, 3);
		assertLine0Scope();
		assertLineScope(view, styler, 1, [
			[0, 4, "punctuation.definition.comment.mylang", "<!--"]
		]);
		
		// Add something inside the new start, make sure it gets the right style
		/*
		<!--a-->
		<!--b
		*/
		changeLine(view, "b", 1, 4, 4);
		assertLineScope(view, styler, 0, [
			[0, 4, "punctuation.definition.comment.mylang", "<!--"],
			[4, 5, "comment.block.mylang", "a"],
			[5, 8, "punctuation.definition.comment.mylang", "-->"]
		]);
		assertLineScope(view, styler, 1, [
			[0, 4, "punctuation.definition.comment.mylang", "<!--"],
			[4, 5, "comment.block.mylang", "b"]
		]);
	});
	
	tests["test TextMateStyler - change - add 'end' 1"] = makeTest(function(view) {
		var styler = new mTextMateStyler.TextMateStyler(view, mTestGrammars.SampleBeginEndGrammar);
		setLines(view, [
			"<!--has no end"
		]);
		
		/*
		<!--has an end-->
		*/
		changeLine(view, "an end-->", 0, 8, 14);
		assertLineScope(view, styler, 0, [
			[0, 4, "punctuation.definition.comment.mylang", "<!--"],
			[4, 14, "comment.block.mylang", "has an end"],
			[14, 17, "punctuation.definition.comment.mylang", "-->"]
		]);
	});
	
	// Add an end when there are multiple regions
	tests["test TextMateStyler - change - add 'end' 2"] = makeTest(function(view) {
		var styler = new mTextMateStyler.TextMateStyler(view, mTestGrammars.SampleBeginEndGrammar);
		setLines(view, [
			"<!--fizz-->",
			"<!--buzz"
		]);
		
		// complete buzz's end token incrementally
		/*
		<!--fizz-->
		<!--buzz-
		*/
		changeLine(view, "-", 1, 8, 8);
		assertLineScope(view, styler, 0, [
			[0, 4, "punctuation.definition.comment.mylang", "<!--"],
			[4, 8, "comment.block.mylang", "fizz"],
			[8, 11, "punctuation.definition.comment.mylang", "-->"]
		]);
		assertLineScope(view, styler, 1, [
			[0, 4, "punctuation.definition.comment.mylang", "<!--"],
			[4, 9, "comment.block.mylang", "buzz-"]
		]);
		
		/*
		<!--fizz-->
		<!--buzz--
		*/
		changeLine(view, "-", 1, 9, 9);
		assertLineScope(view, styler, 0, [
			[0, 4, "punctuation.definition.comment.mylang", "<!--"],
			[4, 8, "comment.block.mylang", "fizz"],
			[8, 11, "punctuation.definition.comment.mylang", "-->"]
		]);
		assertLineScope(view, styler, 1, [
			[0, 4, "punctuation.definition.comment.mylang", "<!--"],
			[4, 8, "comment.block.mylang", "buzz"],
			[8, 10, "invalid.illegal.badcomment.mylang", "--"]
		]);
		
		/*
		<!--fizz-->
		<!--buzz-->
		*/
		changeLine(view, ">", 1, 10, 10);
		assertLineScope(view, styler, 0, [
			[0, 4, "punctuation.definition.comment.mylang", "<!--"],
			[4, 8, "comment.block.mylang", "fizz"],
			[8, 11, "punctuation.definition.comment.mylang", "-->"]
		]);
		assertLineScope(view, styler, 1, [
			[0, 4, "punctuation.definition.comment.mylang", "<!--"],
			[4, 8, "comment.block.mylang", "buzz"],
			[8, 11, "punctuation.definition.comment.mylang", "-->"]
		]);
	}, false);
	

	// Add "end" where a following region exists
	tests["test TextMateStyler - change - add 'end' 3"] = makeTest(function(view) {
		var styler = new mTextMateStyler.TextMateStyler(view, mTestGrammars.SampleBeginEndGrammar);
		setLines(view, [
			"<!--b",
			"<!--c-->" // here <!-- is <! (comment) and -- (invalid) not <!-- (punctuation)
		]);
		
		/*
		<!--b-->
		<!--c-->
		*/
		changeLine(view, "-->", 0, 5, 5);
		assertLineScope(view, styler, 0, [
			[0, 4, "punctuation.definition.comment.mylang", "<!--"],
			[4, 5, "comment.block.mylang", "b"],
			[5, 8, "punctuation.definition.comment.mylang", "-->"]
		]);
		assertLineScope(view, styler, 1, [
			[0, 4, "punctuation.definition.comment.mylang", "<!--"],
			[4, 5, "comment.block.mylang", "c"],
			[5, 8, "punctuation.definition.comment.mylang", "-->"]
		]);
	});

	// Add and "end" when there exist preceding and following regions
	tests["test TextMateStyler - change - add 'end' 4"] = makeTest(function(view) {
		var styler = new mTextMateStyler.TextMateStyler(view, mTestGrammars.SampleBeginEndGrammar);
		setLines(view, [
			"<!--a-->",
			"<!--b",
			"<!--c-->" // here <!-- is <! (comment) and -- (invalid) not <!-- (punctuation)
		]);
		// check initial styles for sanity
		assertLineScope(view, styler, 0, [
			[0, 4, "punctuation.definition.comment.mylang", "<!--"],
			[4, 5, "comment.block.mylang", "a"],
			[5, 8, "punctuation.definition.comment.mylang", "-->"]
		]);
		assertLineScope(view, styler, 1, [
			[0, 4, "punctuation.definition.comment.mylang", "<!--"],
			[4, 5, "comment.block.mylang", "b"]
		]);
		assertLineScope(view, styler, 2, [
			[0, 2, "comment.block.mylang", "<!"],
			[2, 4, "invalid.illegal.badcomment.mylang", "--"],
			[4, 5, "comment.block.mylang", "c"],
			[5, 8, "punctuation.definition.comment.mylang", "-->"]
		]);
		
		// Add end on line 1. Should affect line2
		/*
		<!--a-->
		<!--b-->
		<!--c-->
		*/
		changeLine(view, "-->", 1, 5, 5);
		assertLineScope(view, styler, 0, [
			[0, 4, "punctuation.definition.comment.mylang", "<!--"],
			[4, 5, "comment.block.mylang", "a"],
			[5, 8, "punctuation.definition.comment.mylang", "-->"]
		]);
		assertLineScope(view, styler, 1, [
			[0, 4, "punctuation.definition.comment.mylang", "<!--"],
			[4, 5, "comment.block.mylang", "b"],
			[5, 8, "punctuation.definition.comment.mylang", "-->"]
		]);
		assertLineScope(view, styler, 2, [
			[0, 4, "punctuation.definition.comment.mylang", "<!--"],
			[4, 5, "comment.block.mylang", "c"],
			[5, 8, "punctuation.definition.comment.mylang", "-->"]
		]);
	});
	
	tests["test TextMateStyler - change - remove 'start'"] = makeTest(function(view) {
		var styler = new mTextMateStyler.TextMateStyler(view, mTestGrammars.SampleBeginEndGrammar);
		setLines(view, [
			"<!--xxx int-->"
		]);
		
		/*
		xxx int-->
		*/
		changeLine(view, "", 0, 0, 4);
		assertLineScope(view, styler, 0, [
			[4, 7, "storage.type.mylang", "int"]
		]);
	});
	
	tests["test TextMateStyler - change - remove 'end' 1"] = makeTest(function(view) {
		var styler = new mTextMateStyler.TextMateStyler(view, mTestGrammars.SampleBeginEndGrammar);
		setLines(view, [
			"<!--a-->",
			"<!--b-->",
			"<!--c-->"
		]);
		// Remove end on line1, affects line2 also
		/*
		<!--a-->
		<!--b
		<!--c-->x
		*/
		changeLine(view, "", 1, 5, 8);
		assertLineScope(view, styler, 0, [
			[0, 4, "punctuation.definition.comment.mylang", "<!--"],
			[4, 5, "comment.block.mylang", "a"],
			[5, 8, "punctuation.definition.comment.mylang", "-->"]
		]);
		assertLineScope(view, styler, 1, [
			[0, 4, "punctuation.definition.comment.mylang", "<!--"],
			[4, 5, "comment.block.mylang", "b"]
		]);
		assertLineScope(view, styler, 2, [
			[0, 2, "comment.block.mylang", "<!"],
			[2, 4, "invalid.illegal.badcomment.mylang", "--"],
			[4, 5, "comment.block.mylang", "c"],
			[5, 8, "punctuation.definition.comment.mylang", "-->"]
		]);
	});
	
	// Remove end of a nested region that has sibling regions before and after it
	tests["test TextMateStyler - change - remove 'end' 2"] = makeTest(function(view) {
		var styler = new mTextMateStyler.TextMateStyler(view, mTestGrammars.SampleBeginEndGrammar);
		setLines(view, [
			"<!--a",
			"[a1]",
			"[a2]", // We'll remove this one's end ]
			"[a3]",
			"-->",
			"<!--b-->"
		]);
		assertLineScope(view, styler, 0, [
			[0, 4, "punctuation.definition.comment.mylang", "<!--"],
			[4, 5, "comment.block.mylang", "a"]
		]);
		assertLineScope(view, styler, 1, [
			[0, 1, "meta.brace.square.open.mylang", "["],
			[1, 3, "meta.insquare.mylang", "a1"],
			[3, 4, "meta.brace.square.close.mylang", "]"]
		]);
		assertLineScope(view, styler, 2, [
			[0, 1, "meta.brace.square.open.mylang", "["],
			[1, 3, "meta.insquare.mylang", "a2"],
			[3, 4, "meta.brace.square.close.mylang", "]"]
		]);
		assertLineScope(view, styler, 3, [
			[0, 1, "meta.brace.square.open.mylang", "["],
			[1, 3, "meta.insquare.mylang", "a3"],
			[3, 4, "meta.brace.square.close.mylang", "]"]
		]);
		assertLineScope(view, styler, 4, [
			[0, 3, "punctuation.definition.comment.mylang", "-->"]
		]);
		assertLineScope(view, styler, 5, [
			[0, 4, "punctuation.definition.comment.mylang", "<!--"],
			[4, 5, "comment.block.mylang", "b"],
			[5, 8, "punctuation.definition.comment.mylang", "-->"]
		]);
		
		// Remove end on line2, which makes a2 region extend onto next line
		/*
		<!--a
		[a1]
		[a2
		[a3]
		-->
		<!--b-->
		*/
		changeLine(view, "", 2, 3, 4);
		assertLineScope(view, styler, 0, [
			[0, 4, "punctuation.definition.comment.mylang", "<!--"],
			[4, 5, "comment.block.mylang", "a"]
		]);
		assertLineScope(view, styler, 1, [
			[0, 1, "meta.brace.square.open.mylang", "["],
			[1, 3, "meta.insquare.mylang", "a1"],
			[3, 4, "meta.brace.square.close.mylang", "]"]
		]);
		assertLineScope(view, styler, 2, [
			[0, 1, "meta.brace.square.open.mylang", "["],
			[1, 3, "meta.insquare.mylang", "a2"]
		]);
		assertLineScope(view, styler, 3, [
			[0, 3, "meta.insquare.mylang", "[a3"],
			[3, 4, "meta.brace.square.close.mylang", "]"]
		]);
		assertLineScope(view, styler, 4, [
			[0, 3, "punctuation.definition.comment.mylang", "-->"]
		]);
		assertLineScope(view, styler, 5, [
			[0, 4, "punctuation.definition.comment.mylang", "<!--"],
			[4, 5, "comment.block.mylang", "b"],
			[5, 8, "punctuation.definition.comment.mylang", "-->"]
		]);
	});
	
	tests["test TextMateStyler - change - remove 'end' at eof"] = makeTest(function(view) {
		var styler = new mTextMateStyler.TextMateStyler(view, mTestGrammars.SampleBeginEndGrammar);
		setLines(view, [
			"<!--a-->",
			"<!--b-->"
		]);
		/*
		<!--a-->
		<!--b
		*/
		changeLine(view, "", 1, 5, 8);
		assertLineScope(view, styler, 0, [
			[0, 4, "punctuation.definition.comment.mylang", "<!--"],
			[4, 5, "comment.block.mylang", "a"],
			[5, 8, "punctuation.definition.comment.mylang", "-->"]
		]);
		assertLineScope(view, styler, 1, [
			[0, 4, "punctuation.definition.comment.mylang", "<!--"],
			[4, 5, "comment.block.mylang", "b"]
		]);
	});
	
//	// TODO: more damage/repair of nested regions

	tests["test TextMateStyler - end-to-begin backreferences"] = makeTest(function(view) {
		var styler = new mTextMateStyler.TextMateStyler(view, mTestGrammars.BackrefTestGrammar);
		setLines(view, [
			"This is [b]ENTERPRISE[/b] quality",
			"[del]",
			"i'm line 2",
			"[/del]",
			"[one]aaa[two]bbb[/two]ccc[/one]", // make sure [/two] don't end [one]
			"[a.b]xx[/axb]xx[/a.b]" // make sure [/axb] doesn't end [a.b] (ie. captured period is ecaped)
		]);
		assertLineScope(view, styler, 0, [
			[8, 11, "punctuation.definition.tag.blah", "[b]"],
			[11, 21, "entity.name.tag.blah", "ENTERPRISE"],
			[21, 25, "punctuation.definition.tag.blah", "[/b]"]
		]);
		assertLineScope(view, styler, 1, [ [0, 5, "punctuation.definition.tag.blah", "[del]"] ]);
		assertLineScope(view, styler, 2, [ [0, 10, "entity.name.tag.blah", "i'm line 2"] ]);
		assertLineScope(view, styler, 3, [ [0, 6, "punctuation.definition.tag.blah", "[/del]"] ]);
		assertLineScope(view, styler, 4, [
			[0, 5, "punctuation.definition.tag.blah", "[one]"],
			[5, 25, "entity.name.tag.blah", "aaa[two]bbb[/two]ccc"],
			[25, 31, "punctuation.definition.tag.blah", "[/one]"]
		]);
		assertLineScope(view, styler, 5, [
			[0, 5, "punctuation.definition.tag.blah", "[a.b]"],
			[5, 15, "entity.name.tag.blah", "xx[/axb]xx"],
			[15, 21, "punctuation.definition.tag.blah", "[/a.b]"]
		]);
	});
	
	tests["test TextMateStyler - recursive includes"] = makeTest(function(view) {
		var styler = new mTextMateStyler.TextMateStyler(view, mTestGrammars.RecursiveIncludeGrammar);
		setLines(view, [
			'aa"foo"bb',
			"[]",
			'["aa"]',
			'["aa", "bb"]',
			"[[], []]"
		]);
		assertLineScope(view, styler, 0, [
			[2, 3, "punctuation.definition.string.delimiter", "\""],
			[3, 6, "string.quoted.double", "foo"],
			[6, 7, "punctuation.definition.string.delimiter", "\""]
		]);
		assertLineScope(view, styler, 1, [
			[0, 1, "punctuation.definition.array.begin", "["],
			[1, 2, "punctuation.definition.array.end", "]"]
		]);
		assertLineScope(view, styler, 2, [
			[0, 1, "punctuation.definition.array.begin", "["],
			[1, 2, "punctuation.definition.string.delimiter", "\""],
			[2, 4, "string.quoted.double", "aa"],
			[4, 5, "punctuation.definition.string.delimiter", "\""],
			[5, 6, "punctuation.definition.array.end", "]"]
		]);
		assertLineScope(view, styler, 3, [
			[0, 1, "punctuation.definition.array.begin", "["],
			[1, 2, "punctuation.definition.string.delimiter", "\""],
			[2, 4, "string.quoted.double", "aa"],
			[4, 5, "punctuation.definition.string.delimiter", "\""],
			[5, 6, "punctuation.array.separator", ","],
			[7, 8, "punctuation.definition.string.delimiter", "\""],
			[8, 10, "string.quoted.double", "bb"],
			[10, 11, "punctuation.definition.string.delimiter", "\""],
			[11, 12, "punctuation.definition.array.end", "]"]
		]);
		assertLineScope(view, styler, 4, [
			[0, 1, "punctuation.definition.array.begin", "["],
			[1, 2, "punctuation.definition.array.begin", "["],
			[2, 3, "punctuation.definition.array.end", "]"],
			[3, 4, "punctuation.array.separator", ","],
			[5, 6, "punctuation.definition.array.begin", "["],
			[6, 7, "punctuation.definition.array.end", "]"],
			[7, 8, "punctuation.definition.array.end", "]"]
		]);
	});
	
	return tests;
});