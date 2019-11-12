(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
/*
Syntax highlighting with language autodetection.
https://highlightjs.org/
*/

(function(factory) {

  // Find the global object for export to both the browser and web workers.
  var globalObject = typeof window === 'object' && window ||
                     typeof self === 'object' && self;

  // Setup highlight.js for different environments. First is Node.js or
  // CommonJS.
  // `nodeType` is checked to ensure that `exports` is not a HTML element.
  if(typeof exports !== 'undefined' && !exports.nodeType) {
    factory(exports);
  } else if(globalObject) {
    // Export hljs globally even when using AMD for cases when this script
    // is loaded with others that may still expect a global hljs.
    globalObject.hljs = factory({});

    // Finally register the global hljs with AMD.
    if(typeof define === 'function' && define.amd) {
      define([], function() {
        return globalObject.hljs;
      });
    }
  }

}(function(hljs) {
  // Convenience variables for build-in objects
  var ArrayProto = [],
      objectKeys = Object.keys;

  // Global internal variables used within the highlight.js library.
  var languages = {},
      aliases   = {};

  // Regular expressions used throughout the highlight.js library.
  var noHighlightRe    = /^(no-?highlight|plain|text)$/i,
      languagePrefixRe = /\blang(?:uage)?-([\w-]+)\b/i,
      fixMarkupRe      = /((^(<[^>]+>|\t|)+|(?:\n)))/gm;

  // The object will be assigned by the build tool. It used to synchronize API
  // of external language files with minified version of the highlight.js library.
  var API_REPLACES;

  var spanEndTag = '</span>';

  // Global options used when within external APIs. This is modified when
  // calling the `hljs.configure` function.
  var options = {
    classPrefix: 'hljs-',
    tabReplace: null,
    useBR: false,
    languages: undefined
  };

  // keywords that should have no default relevance value
  var COMMON_KEYWORDS = 'of and for in not or if then'.split(' ')


  /* Utility functions */

  function escape(value) {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function tag(node) {
    return node.nodeName.toLowerCase();
  }

  function testRe(re, lexeme) {
    var match = re && re.exec(lexeme);
    return match && match.index === 0;
  }

  function isNotHighlighted(language) {
    return noHighlightRe.test(language);
  }

  function blockLanguage(block) {
    var i, match, length, _class;
    var classes = block.className + ' ';

    classes += block.parentNode ? block.parentNode.className : '';

    // language-* takes precedence over non-prefixed class names.
    match = languagePrefixRe.exec(classes);
    if (match) {
      return getLanguage(match[1]) ? match[1] : 'no-highlight';
    }

    classes = classes.split(/\s+/);

    for (i = 0, length = classes.length; i < length; i++) {
      _class = classes[i];

      if (isNotHighlighted(_class) || getLanguage(_class)) {
        return _class;
      }
    }
  }

  function inherit(parent) {  // inherit(parent, override_obj, override_obj, ...)
    var key;
    var result = {};
    var objects = Array.prototype.slice.call(arguments, 1);

    for (key in parent)
      result[key] = parent[key];
    objects.forEach(function(obj) {
      for (key in obj)
        result[key] = obj[key];
    });
    return result;
  }

  /* Stream merging */

  function nodeStream(node) {
    var result = [];
    (function _nodeStream(node, offset) {
      for (var child = node.firstChild; child; child = child.nextSibling) {
        if (child.nodeType === 3)
          offset += child.nodeValue.length;
        else if (child.nodeType === 1) {
          result.push({
            event: 'start',
            offset: offset,
            node: child
          });
          offset = _nodeStream(child, offset);
          // Prevent void elements from having an end tag that would actually
          // double them in the output. There are more void elements in HTML
          // but we list only those realistically expected in code display.
          if (!tag(child).match(/br|hr|img|input/)) {
            result.push({
              event: 'stop',
              offset: offset,
              node: child
            });
          }
        }
      }
      return offset;
    })(node, 0);
    return result;
  }

  function mergeStreams(original, highlighted, value) {
    var processed = 0;
    var result = '';
    var nodeStack = [];

    function selectStream() {
      if (!original.length || !highlighted.length) {
        return original.length ? original : highlighted;
      }
      if (original[0].offset !== highlighted[0].offset) {
        return (original[0].offset < highlighted[0].offset) ? original : highlighted;
      }

      /*
      To avoid starting the stream just before it should stop the order is
      ensured that original always starts first and closes last:

      if (event1 == 'start' && event2 == 'start')
        return original;
      if (event1 == 'start' && event2 == 'stop')
        return highlighted;
      if (event1 == 'stop' && event2 == 'start')
        return original;
      if (event1 == 'stop' && event2 == 'stop')
        return highlighted;

      ... which is collapsed to:
      */
      return highlighted[0].event === 'start' ? original : highlighted;
    }

    function open(node) {
      function attr_str(a) {return ' ' + a.nodeName + '="' + escape(a.value).replace('"', '&quot;') + '"';}
      result += '<' + tag(node) + ArrayProto.map.call(node.attributes, attr_str).join('') + '>';
    }

    function close(node) {
      result += '</' + tag(node) + '>';
    }

    function render(event) {
      (event.event === 'start' ? open : close)(event.node);
    }

    while (original.length || highlighted.length) {
      var stream = selectStream();
      result += escape(value.substring(processed, stream[0].offset));
      processed = stream[0].offset;
      if (stream === original) {
        /*
        On any opening or closing tag of the original markup we first close
        the entire highlighted node stack, then render the original tag along
        with all the following original tags at the same offset and then
        reopen all the tags on the highlighted stack.
        */
        nodeStack.reverse().forEach(close);
        do {
          render(stream.splice(0, 1)[0]);
          stream = selectStream();
        } while (stream === original && stream.length && stream[0].offset === processed);
        nodeStack.reverse().forEach(open);
      } else {
        if (stream[0].event === 'start') {
          nodeStack.push(stream[0].node);
        } else {
          nodeStack.pop();
        }
        render(stream.splice(0, 1)[0]);
      }
    }
    return result + escape(value.substr(processed));
  }

  /* Initialization */

  function dependencyOnParent(mode) {
    if (!mode) return false;

    return mode.endsWithParent || dependencyOnParent(mode.starts)
  }

  function expand_or_clone_mode(mode) {
    if (mode.variants && !mode.cached_variants) {
      mode.cached_variants = mode.variants.map(function(variant) {
        return inherit(mode, {variants: null}, variant);
      });
    }

    // EXPAND
    // if we have variants then essentually "replace" the mode with the variants
    // this happens in compileMode, where this function is called from
    if (mode.cached_variants)
      return mode.cached_variants;

    // CLONE
    // if we have dependencies on parents then we need a unique
    // instance of ourselves, so we can be reused with many
    // different parents without issue
    if (dependencyOnParent(mode))
      return [inherit(mode, { starts: mode.starts ? inherit(mode.starts) : null })]

    // no special dependency issues, just return ourselves
    return [mode]
  }

  function restoreLanguageApi(obj) {
    if(API_REPLACES && !obj.langApiRestored) {
      obj.langApiRestored = true;
      for(var key in API_REPLACES)
        obj[key] && (obj[API_REPLACES[key]] = obj[key]);
      (obj.contains || []).concat(obj.variants || []).forEach(restoreLanguageApi);
    }
  }

  function compileKeywords(rawKeywords, case_insensitive) {
      var compiled_keywords = {};

      if (typeof rawKeywords === 'string') { // string
        splitAndCompile('keyword', rawKeywords);
      } else {
        objectKeys(rawKeywords).forEach(function (className) {
          splitAndCompile(className, rawKeywords[className]);
        });
      }
    return compiled_keywords;

    // ---

    function splitAndCompile(className, str) {
      if (case_insensitive) {
        str = str.toLowerCase();
      }
      str.split(' ').forEach(function(keyword) {
        var pair = keyword.split('|');
        compiled_keywords[pair[0]] = [className, scoreForKeyword(pair[0], pair[1])];
      });
    };
  }

  function scoreForKeyword(keyword, providedScore) {
    // manual scores always win over common keywords
    // so you can force a score of 1 if you really insist
    if (providedScore)
      return Number(providedScore)

    return commonKeyword(keyword) ? 0 : 1;
  }

  function commonKeyword(word) {
    return COMMON_KEYWORDS.indexOf(word.toLowerCase()) != -1
  }

  function compileLanguage(language) {

    function reStr(re) {
        return (re && re.source) || re;
    }

    function langRe(value, global) {
      return new RegExp(
        reStr(value),
        'm' + (language.case_insensitive ? 'i' : '') + (global ? 'g' : '')
      );
    }

    function reCountMatchGroups(re) {
      return (new RegExp(re.toString() + '|')).exec('').length - 1;
    }

    // joinRe logically computes regexps.join(separator), but fixes the
    // backreferences so they continue to match.
    // it also places each individual regular expression into it's own
    // match group, keeping track of the sequencing of those match groups
    // is currently an exercise for the caller. :-)
    function joinRe(regexps, separator) {
      // backreferenceRe matches an open parenthesis or backreference. To avoid
      // an incorrect parse, it additionally matches the following:
      // - [...] elements, where the meaning of parentheses and escapes change
      // - other escape sequences, so we do not misparse escape sequences as
      //   interesting elements
      // - non-matching or lookahead parentheses, which do not capture. These
      //   follow the '(' with a '?'.
      var backreferenceRe = /\[(?:[^\\\]]|\\.)*\]|\(\??|\\([1-9][0-9]*)|\\./;
      var numCaptures = 0;
      var ret = '';
      for (var i = 0; i < regexps.length; i++) {
        numCaptures += 1;
        var offset = numCaptures;
        var re = reStr(regexps[i]);
        if (i > 0) {
          ret += separator;
        }
        ret += "(";
        while (re.length > 0) {
          var match = backreferenceRe.exec(re);
          if (match == null) {
            ret += re;
            break;
          }
          ret += re.substring(0, match.index);
          re = re.substring(match.index + match[0].length);
          if (match[0][0] == '\\' && match[1]) {
            // Adjust the backreference.
            ret += '\\' + String(Number(match[1]) + offset);
          } else {
            ret += match[0];
            if (match[0] == '(') {
              numCaptures++;
            }
          }
        }
        ret += ")";
      }
      return ret;
    }

    function buildModeRegex(mode) {

      var matchIndexes = {};
      var matcherRe;
      var regexes = [];
      var matcher = {};
      var matchAt = 1;

      function addRule(rule, regex) {
        matchIndexes[matchAt] = rule;
        regexes.push([rule, regex]);
        matchAt += reCountMatchGroups(regex) + 1;
      }

      var term;
      for (var i=0; i < mode.contains.length; i++) {
        var re;
        term = mode.contains[i];
        if (term.beginKeywords) {
          re = '\\.?(?:' + term.begin + ')\\.?';
        } else {
          re = term.begin;
        }
        addRule(term, re);
      }
      if (mode.terminator_end)
        addRule("end", mode.terminator_end);
      if (mode.illegal)
        addRule("illegal", mode.illegal);

      var terminators = regexes.map(function(el) { return el[1] });
      matcherRe = langRe(joinRe(terminators, '|'), true);

      matcher.lastIndex = 0;
      matcher.exec = function(s) {
        var rule;

        if( regexes.length === 0) return null;

        matcherRe.lastIndex = matcher.lastIndex;
        var match = matcherRe.exec(s);
        if (!match) { return null; }

        for(var i = 0; i<match.length; i++) {
          if (match[i] != undefined && matchIndexes["" +i] != undefined ) {
            rule = matchIndexes[""+i];
            break;
          }
        }

        // illegal or end match
        if (typeof rule === "string") {
          match.type = rule;
          match.extra = [mode.illegal, mode.terminator_end];
        } else {
          match.type = "begin";
          match.rule = rule;
        }
        return match;
      }

      return matcher;
    }

    function compileMode(mode, parent) {
      if (mode.compiled)
        return;
      mode.compiled = true;

      mode.keywords = mode.keywords || mode.beginKeywords;
      if (mode.keywords)
        mode.keywords = compileKeywords(mode.keywords, language.case_insensitive)

      mode.lexemesRe = langRe(mode.lexemes || /\w+/, true);

      if (parent) {
        if (mode.beginKeywords) {
          mode.begin = '\\b(' + mode.beginKeywords.split(' ').join('|') + ')\\b';
        }
        if (!mode.begin)
          mode.begin = /\B|\b/;
        mode.beginRe = langRe(mode.begin);
        if (mode.endSameAsBegin)
          mode.end = mode.begin;
        if (!mode.end && !mode.endsWithParent)
          mode.end = /\B|\b/;
        if (mode.end)
          mode.endRe = langRe(mode.end);
        mode.terminator_end = reStr(mode.end) || '';
        if (mode.endsWithParent && parent.terminator_end)
          mode.terminator_end += (mode.end ? '|' : '') + parent.terminator_end;
      }
      if (mode.illegal)
        mode.illegalRe = langRe(mode.illegal);
      if (mode.relevance == null)
        mode.relevance = 1;
      if (!mode.contains) {
        mode.contains = [];
      }
      mode.contains = Array.prototype.concat.apply([], mode.contains.map(function(c) {
        return expand_or_clone_mode(c === 'self' ? mode : c);
      }));
      mode.contains.forEach(function(c) {compileMode(c, mode);});

      if (mode.starts) {
        compileMode(mode.starts, parent);
      }

      mode.terminators = buildModeRegex(mode);
    }

    compileMode(language);
  }

  /*
  Core highlighting function. Accepts a language name, or an alias, and a
  string with the code to highlight. Returns an object with the following
  properties:

  - relevance (int)
  - value (an HTML string with highlighting markup)

  */
  function highlight(name, value, ignore_illegals, continuation) {

    function escapeRe(value) {
      return new RegExp(value.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'm');
    }

    function endOfMode(mode, lexeme) {
      if (testRe(mode.endRe, lexeme)) {
        while (mode.endsParent && mode.parent) {
          mode = mode.parent;
        }
        return mode;
      }
      if (mode.endsWithParent) {
        return endOfMode(mode.parent, lexeme);
      }
    }

    function keywordMatch(mode, match) {
      var match_str = language.case_insensitive ? match[0].toLowerCase() : match[0];
      return mode.keywords.hasOwnProperty(match_str) && mode.keywords[match_str];
    }

    function buildSpan(classname, insideSpan, leaveOpen, noPrefix) {
      if (!leaveOpen && insideSpan === '') return '';
      if (!classname) return insideSpan;

      var classPrefix = noPrefix ? '' : options.classPrefix,
          openSpan    = '<span class="' + classPrefix,
          closeSpan   = leaveOpen ? '' : spanEndTag;

      openSpan += classname + '">';

      return openSpan + insideSpan + closeSpan;
    }

    function processKeywords() {
      var keyword_match, last_index, match, result;

      if (!top.keywords)
        return escape(mode_buffer);

      result = '';
      last_index = 0;
      top.lexemesRe.lastIndex = 0;
      match = top.lexemesRe.exec(mode_buffer);

      while (match) {
        result += escape(mode_buffer.substring(last_index, match.index));
        keyword_match = keywordMatch(top, match);
        if (keyword_match) {
          relevance += keyword_match[1];
          result += buildSpan(keyword_match[0], escape(match[0]));
        } else {
          result += escape(match[0]);
        }
        last_index = top.lexemesRe.lastIndex;
        match = top.lexemesRe.exec(mode_buffer);
      }
      return result + escape(mode_buffer.substr(last_index));
    }

    function processSubLanguage() {
      var explicit = typeof top.subLanguage === 'string';
      if (explicit && !languages[top.subLanguage]) {
        return escape(mode_buffer);
      }

      var result = explicit ?
                   highlight(top.subLanguage, mode_buffer, true, continuations[top.subLanguage]) :
                   highlightAuto(mode_buffer, top.subLanguage.length ? top.subLanguage : undefined);

      // Counting embedded language score towards the host language may be disabled
      // with zeroing the containing mode relevance. Usecase in point is Markdown that
      // allows XML everywhere and makes every XML snippet to have a much larger Markdown
      // score.
      if (top.relevance > 0) {
        relevance += result.relevance;
      }
      if (explicit) {
        continuations[top.subLanguage] = result.top;
      }
      return buildSpan(result.language, result.value, false, true);
    }

    function processBuffer() {
      result += (top.subLanguage != null ? processSubLanguage() : processKeywords());
      mode_buffer = '';
    }

    function startNewMode(mode) {
      result += mode.className? buildSpan(mode.className, '', true): '';
      top = Object.create(mode, {parent: {value: top}});
    }


    function doBeginMatch(match) {
      var lexeme = match[0];
      var new_mode = match.rule;

      if (new_mode && new_mode.endSameAsBegin) {
        new_mode.endRe = escapeRe( lexeme );
      }

      if (new_mode.skip) {
        mode_buffer += lexeme;
      } else {
        if (new_mode.excludeBegin) {
          mode_buffer += lexeme;
        }
        processBuffer();
        if (!new_mode.returnBegin && !new_mode.excludeBegin) {
          mode_buffer = lexeme;
        }
      }
      startNewMode(new_mode, lexeme);
      return new_mode.returnBegin ? 0 : lexeme.length;
    }

    function doEndMatch(match) {
      var lexeme = match[0];
      var end_mode = endOfMode(top, lexeme);
      if (!end_mode) { return; }

      var origin = top;
      if (origin.skip) {
        mode_buffer += lexeme;
      } else {
        if (!(origin.returnEnd || origin.excludeEnd)) {
          mode_buffer += lexeme;
        }
        processBuffer();
        if (origin.excludeEnd) {
          mode_buffer = lexeme;
        }
      }
      do {
        if (top.className) {
          result += spanEndTag;
        }
        if (!top.skip && !top.subLanguage) {
          relevance += top.relevance;
        }
        top = top.parent;
      } while (top !== end_mode.parent);
      if (end_mode.starts) {
        if (end_mode.endSameAsBegin) {
          end_mode.starts.endRe = end_mode.endRe;
        }
        startNewMode(end_mode.starts, '');
      }
      return origin.returnEnd ? 0 : lexeme.length;
    }

    var lastMatch = {};
    function processLexeme(text_before_match, match) {

      var lexeme = match && match[0];

      // add non-matched text to the current mode buffer
      mode_buffer += text_before_match;

      if (lexeme == null) {
        processBuffer();
        return 0;
      }

      // we've found a 0 width match and we're stuck, so we need to advance
      // this happens when we have badly behaved rules that have optional matchers to the degree that
      // sometimes they can end up matching nothing at all
      // Ref: https://github.com/highlightjs/highlight.js/issues/2140
      if (lastMatch.type=="begin" && match.type=="end" && lastMatch.index == match.index && lexeme === "") {
        // spit the "skipped" character that our regex choked on back into the output sequence
        mode_buffer += value.slice(match.index, match.index + 1)
        return 1;
      }
      lastMatch = match;

      if (match.type==="begin") {
        return doBeginMatch(match);
      } else if (match.type==="illegal" && !ignore_illegals) {
        // illegal match, we do not continue processing
        throw new Error('Illegal lexeme "' + lexeme + '" for mode "' + (top.className || '<unnamed>') + '"');
      } else if (match.type==="end") {
        var processed = doEndMatch(match);
        if (processed != undefined)
          return processed;
      }

      /*
      Why might be find ourselves here?  Only one occasion now.  An end match that was
      triggered but could not be completed.  When might this happen?  When an `endSameasBegin`
      rule sets the end rule to a specific match.  Since the overall mode termination rule that's
      being used to scan the text isn't recompiled that means that any match that LOOKS like
      the end (but is not, because it is not an exact match to the beginning) will
      end up here.  A definite end match, but when `doEndMatch` tries to "reapply"
      the end rule and fails to match, we wind up here, and just silently ignore the end.

      This causes no real harm other than stopping a few times too many.
      */

      mode_buffer += lexeme;
      return lexeme.length;
    }

    var language = getLanguage(name);
    if (!language) {
      throw new Error('Unknown language: "' + name + '"');
    }

    compileLanguage(language);
    var top = continuation || language;
    var continuations = {}; // keep continuations for sub-languages
    var result = '', current;
    for(current = top; current !== language; current = current.parent) {
      if (current.className) {
        result = buildSpan(current.className, '', true) + result;
      }
    }
    var mode_buffer = '';
    var relevance = 0;
    try {
      var match, count, index = 0;
      while (true) {
        top.terminators.lastIndex = index;
        match = top.terminators.exec(value);
        if (!match)
          break;
        count = processLexeme(value.substring(index, match.index), match);
        index = match.index + count;
      }
      processLexeme(value.substr(index));
      for(current = top; current.parent; current = current.parent) { // close dangling modes
        if (current.className) {
          result += spanEndTag;
        }
      }
      return {
        relevance: relevance,
        value: result,
        illegal:false,
        language: name,
        top: top
      };
    } catch (e) {
      if (e.message && e.message.indexOf('Illegal') !== -1) {
        return {
          illegal: true,
          relevance: 0,
          value: escape(value)
        };
      } else {
        throw e;
      }
    }
  }

  /*
  Highlighting with language detection. Accepts a string with the code to
  highlight. Returns an object with the following properties:

  - language (detected language)
  - relevance (int)
  - value (an HTML string with highlighting markup)
  - second_best (object with the same structure for second-best heuristically
    detected language, may be absent)

  */
  function highlightAuto(text, languageSubset) {
    languageSubset = languageSubset || options.languages || objectKeys(languages);
    var result = {
      relevance: 0,
      value: escape(text)
    };
    var second_best = result;
    languageSubset.filter(getLanguage).filter(autoDetection).forEach(function(name) {
      var current = highlight(name, text, false);
      current.language = name;
      if (current.relevance > second_best.relevance) {
        second_best = current;
      }
      if (current.relevance > result.relevance) {
        second_best = result;
        result = current;
      }
    });
    if (second_best.language) {
      result.second_best = second_best;
    }
    return result;
  }

  /*
  Post-processing of the highlighted markup:

  - replace TABs with something more useful
  - replace real line-breaks with '<br>' for non-pre containers

  */
  function fixMarkup(value) {
    return !(options.tabReplace || options.useBR)
      ? value
      : value.replace(fixMarkupRe, function(match, p1) {
          if (options.useBR && match === '\n') {
            return '<br>';
          } else if (options.tabReplace) {
            return p1.replace(/\t/g, options.tabReplace);
          }
          return '';
      });
  }

  function buildClassName(prevClassName, currentLang, resultLang) {
    var language = currentLang ? aliases[currentLang] : resultLang,
        result   = [prevClassName.trim()];

    if (!prevClassName.match(/\bhljs\b/)) {
      result.push('hljs');
    }

    if (prevClassName.indexOf(language) === -1) {
      result.push(language);
    }

    return result.join(' ').trim();
  }

  /*
  Applies highlighting to a DOM node containing code. Accepts a DOM node and
  two optional parameters for fixMarkup.
  */
  function highlightBlock(block) {
    var node, originalStream, result, resultNode, text;
    var language = blockLanguage(block);

    if (isNotHighlighted(language))
        return;

    if (options.useBR) {
      node = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
      node.innerHTML = block.innerHTML.replace(/\n/g, '').replace(/<br[ \/]*>/g, '\n');
    } else {
      node = block;
    }
    text = node.textContent;
    result = language ? highlight(language, text, true) : highlightAuto(text);

    originalStream = nodeStream(node);
    if (originalStream.length) {
      resultNode = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
      resultNode.innerHTML = result.value;
      result.value = mergeStreams(originalStream, nodeStream(resultNode), text);
    }
    result.value = fixMarkup(result.value);

    block.innerHTML = result.value;
    block.className = buildClassName(block.className, language, result.language);
    block.result = {
      language: result.language,
      re: result.relevance
    };
    if (result.second_best) {
      block.second_best = {
        language: result.second_best.language,
        re: result.second_best.relevance
      };
    }
  }

  /*
  Updates highlight.js global options with values passed in the form of an object.
  */
  function configure(user_options) {
    options = inherit(options, user_options);
  }

  /*
  Applies highlighting to all <pre><code>..</code></pre> blocks on a page.
  */
  function initHighlighting() {
    if (initHighlighting.called)
      return;
    initHighlighting.called = true;

    var blocks = document.querySelectorAll('pre code');
    ArrayProto.forEach.call(blocks, highlightBlock);
  }

  /*
  Attaches highlighting to the page load event.
  */
  function initHighlightingOnLoad() {
    addEventListener('DOMContentLoaded', initHighlighting, false);
    addEventListener('load', initHighlighting, false);
  }

  function registerLanguage(name, language) {
    var lang = languages[name] = language(hljs);
    restoreLanguageApi(lang);
    lang.rawDefinition = language.bind(null,hljs);

    if (lang.aliases) {
      lang.aliases.forEach(function(alias) {aliases[alias] = name;});
    }
  }

  function listLanguages() {
    return objectKeys(languages);
  }

  function getLanguage(name) {
    name = (name || '').toLowerCase();
    return languages[name] || languages[aliases[name]];
  }

  function autoDetection(name) {
    var lang = getLanguage(name);
    return lang && !lang.disableAutodetect;
  }

  /* Interface definition */

  hljs.highlight = highlight;
  hljs.highlightAuto = highlightAuto;
  hljs.fixMarkup = fixMarkup;
  hljs.highlightBlock = highlightBlock;
  hljs.configure = configure;
  hljs.initHighlighting = initHighlighting;
  hljs.initHighlightingOnLoad = initHighlightingOnLoad;
  hljs.registerLanguage = registerLanguage;
  hljs.listLanguages = listLanguages;
  hljs.getLanguage = getLanguage;
  hljs.autoDetection = autoDetection;
  hljs.inherit = inherit;

  // Common regexps
  hljs.IDENT_RE = '[a-zA-Z]\\w*';
  hljs.UNDERSCORE_IDENT_RE = '[a-zA-Z_]\\w*';
  hljs.NUMBER_RE = '\\b\\d+(\\.\\d+)?';
  hljs.C_NUMBER_RE = '(-?)(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)'; // 0x..., 0..., decimal, float
  hljs.BINARY_NUMBER_RE = '\\b(0b[01]+)'; // 0b...
  hljs.RE_STARTERS_RE = '!|!=|!==|%|%=|&|&&|&=|\\*|\\*=|\\+|\\+=|,|-|-=|/=|/|:|;|<<|<<=|<=|<|===|==|=|>>>=|>>=|>=|>>>|>>|>|\\?|\\[|\\{|\\(|\\^|\\^=|\\||\\|=|\\|\\||~';

  // Common modes
  hljs.BACKSLASH_ESCAPE = {
    begin: '\\\\[\\s\\S]', relevance: 0
  };
  hljs.APOS_STRING_MODE = {
    className: 'string',
    begin: '\'', end: '\'',
    illegal: '\\n',
    contains: [hljs.BACKSLASH_ESCAPE]
  };
  hljs.QUOTE_STRING_MODE = {
    className: 'string',
    begin: '"', end: '"',
    illegal: '\\n',
    contains: [hljs.BACKSLASH_ESCAPE]
  };
  hljs.PHRASAL_WORDS_MODE = {
    begin: /\b(a|an|the|are|I'm|isn't|don't|doesn't|won't|but|just|should|pretty|simply|enough|gonna|going|wtf|so|such|will|you|your|they|like|more)\b/
  };
  hljs.COMMENT = function (begin, end, inherits) {
    var mode = hljs.inherit(
      {
        className: 'comment',
        begin: begin, end: end,
        contains: []
      },
      inherits || {}
    );
    mode.contains.push(hljs.PHRASAL_WORDS_MODE);
    mode.contains.push({
      className: 'doctag',
      begin: '(?:TODO|FIXME|NOTE|BUG|XXX):',
      relevance: 0
    });
    return mode;
  };
  hljs.C_LINE_COMMENT_MODE = hljs.COMMENT('//', '$');
  hljs.C_BLOCK_COMMENT_MODE = hljs.COMMENT('/\\*', '\\*/');
  hljs.HASH_COMMENT_MODE = hljs.COMMENT('#', '$');
  hljs.NUMBER_MODE = {
    className: 'number',
    begin: hljs.NUMBER_RE,
    relevance: 0
  };
  hljs.C_NUMBER_MODE = {
    className: 'number',
    begin: hljs.C_NUMBER_RE,
    relevance: 0
  };
  hljs.BINARY_NUMBER_MODE = {
    className: 'number',
    begin: hljs.BINARY_NUMBER_RE,
    relevance: 0
  };
  hljs.CSS_NUMBER_MODE = {
    className: 'number',
    begin: hljs.NUMBER_RE + '(' +
      '%|em|ex|ch|rem'  +
      '|vw|vh|vmin|vmax' +
      '|cm|mm|in|pt|pc|px' +
      '|deg|grad|rad|turn' +
      '|s|ms' +
      '|Hz|kHz' +
      '|dpi|dpcm|dppx' +
      ')?',
    relevance: 0
  };
  hljs.REGEXP_MODE = {
    className: 'regexp',
    begin: /\//, end: /\/[gimuy]*/,
    illegal: /\n/,
    contains: [
      hljs.BACKSLASH_ESCAPE,
      {
        begin: /\[/, end: /\]/,
        relevance: 0,
        contains: [hljs.BACKSLASH_ESCAPE]
      }
    ]
  };
  hljs.TITLE_MODE = {
    className: 'title',
    begin: hljs.IDENT_RE,
    relevance: 0
  };
  hljs.UNDERSCORE_TITLE_MODE = {
    className: 'title',
    begin: hljs.UNDERSCORE_IDENT_RE,
    relevance: 0
  };
  hljs.METHOD_GUARD = {
    // excludes method names from keyword processing
    begin: '\\.\\s*' + hljs.UNDERSCORE_IDENT_RE,
    relevance: 0
  };

  return hljs;
}));

},{}],2:[function(require,module,exports){
module.exports = function(hljs) {
  var IDENT_RE = '[A-Za-z$_][0-9A-Za-z$_]*';
  var KEYWORDS = {
    keyword:
      'in of if for while finally var new function do return void else break catch ' +
      'instanceof with throw case default try this switch continue typeof delete ' +
      'let yield const export super debugger as async await static ' +
      // ECMAScript 6 modules import
      'import from as'
    ,
    literal:
      'true false null undefined NaN Infinity',
    built_in:
      'eval isFinite isNaN parseFloat parseInt decodeURI decodeURIComponent ' +
      'encodeURI encodeURIComponent escape unescape Object Function Boolean Error ' +
      'EvalError InternalError RangeError ReferenceError StopIteration SyntaxError ' +
      'TypeError URIError Number Math Date String RegExp Array Float32Array ' +
      'Float64Array Int16Array Int32Array Int8Array Uint16Array Uint32Array ' +
      'Uint8Array Uint8ClampedArray ArrayBuffer DataView JSON Intl arguments require ' +
      'module console window document Symbol Set Map WeakSet WeakMap Proxy Reflect ' +
      'Promise'
  };
  var NUMBER = {
    className: 'number',
    variants: [
      { begin: '\\b(0[bB][01]+)n?' },
      { begin: '\\b(0[oO][0-7]+)n?' },
      { begin: hljs.C_NUMBER_RE + 'n?' }
    ],
    relevance: 0
  };
  var SUBST = {
    className: 'subst',
    begin: '\\$\\{', end: '\\}',
    keywords: KEYWORDS,
    contains: []  // defined later
  };
  var HTML_TEMPLATE = {
    begin: 'html`', end: '',
    starts: {
      end: '`', returnEnd: false,
      contains: [
        hljs.BACKSLASH_ESCAPE,
        SUBST
      ],
      subLanguage: 'xml',
    }
  };
  var CSS_TEMPLATE = {
    begin: 'css`', end: '',
    starts: {
      end: '`', returnEnd: false,
      contains: [
        hljs.BACKSLASH_ESCAPE,
        SUBST
      ],
      subLanguage: 'css',
    }
  };
  var TEMPLATE_STRING = {
    className: 'string',
    begin: '`', end: '`',
    contains: [
      hljs.BACKSLASH_ESCAPE,
      SUBST
    ]
  };
  SUBST.contains = [
    hljs.APOS_STRING_MODE,
    hljs.QUOTE_STRING_MODE,
    HTML_TEMPLATE,
    CSS_TEMPLATE,
    TEMPLATE_STRING,
    NUMBER,
    hljs.REGEXP_MODE
  ];
  var PARAMS_CONTAINS = SUBST.contains.concat([
    hljs.C_BLOCK_COMMENT_MODE,
    hljs.C_LINE_COMMENT_MODE
  ]);

  return {
    aliases: ['js', 'jsx'],
    keywords: KEYWORDS,
    contains: [
      {
        className: 'meta',
        relevance: 10,
        begin: /^\s*['"]use (strict|asm)['"]/
      },
      {
        className: 'meta',
        begin: /^#!/, end: /$/
      },
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      HTML_TEMPLATE,
      CSS_TEMPLATE,
      TEMPLATE_STRING,
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      NUMBER,
      { // object attr container
        begin: /[{,\n]\s*/, relevance: 0,
        contains: [
          {
            begin: IDENT_RE + '\\s*:', returnBegin: true,
            relevance: 0,
            contains: [{className: 'attr', begin: IDENT_RE, relevance: 0}]
          }
        ]
      },
      { // "value" container
        begin: '(' + hljs.RE_STARTERS_RE + '|\\b(case|return|throw)\\b)\\s*',
        keywords: 'return throw case',
        contains: [
          hljs.C_LINE_COMMENT_MODE,
          hljs.C_BLOCK_COMMENT_MODE,
          hljs.REGEXP_MODE,
          {
            className: 'function',
            begin: '(\\(.*?\\)|' + IDENT_RE + ')\\s*=>', returnBegin: true,
            end: '\\s*=>',
            contains: [
              {
                className: 'params',
                variants: [
                  {
                    begin: IDENT_RE
                  },
                  {
                    begin: /\(\s*\)/,
                  },
                  {
                    begin: /\(/, end: /\)/,
                    excludeBegin: true, excludeEnd: true,
                    keywords: KEYWORDS,
                    contains: PARAMS_CONTAINS
                  }
                ]
              }
            ]
          },
          {
            className: '',
            begin: /\s/,
            end: /\s*/,
            skip: true,
          },
          { // E4X / JSX
            begin: /</, end: /(\/[A-Za-z0-9\\._:-]+|[A-Za-z0-9\\._:-]+\/)>/,
            subLanguage: 'xml',
            contains: [
              { begin: /<[A-Za-z0-9\\._:-]+\s*\/>/, skip: true },
              {
                begin: /<[A-Za-z0-9\\._:-]+/, end: /(\/[A-Za-z0-9\\._:-]+|[A-Za-z0-9\\._:-]+\/)>/, skip: true,
                contains: [
                  { begin: /<[A-Za-z0-9\\._:-]+\s*\/>/, skip: true },
                  'self'
                ]
              }
            ]
          }
        ],
        relevance: 0
      },
      {
        className: 'function',
        beginKeywords: 'function', end: /\{/, excludeEnd: true,
        contains: [
          hljs.inherit(hljs.TITLE_MODE, {begin: IDENT_RE}),
          {
            className: 'params',
            begin: /\(/, end: /\)/,
            excludeBegin: true,
            excludeEnd: true,
            contains: PARAMS_CONTAINS
          }
        ],
        illegal: /\[|%/
      },
      {
        begin: /\$[(.]/ // relevance booster for a pattern common to JS libs: `$(something)` and `$.something`
      },
      hljs.METHOD_GUARD,
      { // ES6 class
        className: 'class',
        beginKeywords: 'class', end: /[{;=]/, excludeEnd: true,
        illegal: /[:"\[\]]/,
        contains: [
          {beginKeywords: 'extends'},
          hljs.UNDERSCORE_TITLE_MODE
        ]
      },
      {
        beginKeywords: 'constructor get set', end: /\{/, excludeEnd: true
      }
    ],
    illegal: /#(?!!)/
  };
};
},{}],3:[function(require,module,exports){
'use strict';

var _highlight = require('highlight.js/lib/highlight');

var _highlight2 = _interopRequireDefault(_highlight);

var _javascript = require('highlight.js/lib/languages/javascript');

var _javascript2 = _interopRequireDefault(_javascript);

var _pageTransition = require('./modules/pageTransition');

var _pageTransition2 = _interopRequireDefault(_pageTransition);

var _hamburger = require('./modules/hamburger');

var _hamburger2 = _interopRequireDefault(_hamburger);

var _pageScroll = require('./modules/pageScroll');

var _pageScroll2 = _interopRequireDefault(_pageScroll);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(function ($) {
  // When DOM is ready
  $(function () {
    _pageTransition2.default.transition();
    $('#currentYear').text('' + new Date().getFullYear());
    _pageScroll2.default.smoothScrolling();
    _hamburger2.default.handler();
    _highlight2.default.registerLanguage('javascript', _javascript2.default);
    _highlight2.default.initHighlightingOnLoad();
  });
})(jQuery); // You can write a call and import your functions in this file.
//
// This file will be compiled into app.js and will not be minified.
// Feel free with using ES6 here.

// import {NAME} from './modules/...';

},{"./modules/hamburger":4,"./modules/pageScroll":5,"./modules/pageTransition":6,"highlight.js/lib/highlight":1,"highlight.js/lib/languages/javascript":2}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var hamburger = {
  handler: function handler() {
    var $body = $('body');
    var $btn = $('.hamburger');
    var $menu = $('.menu');
    var $submenu = $('.submenu');
    var $submenuLink = $('.menu__link--submenu');
    var $submenuClose = $('.submenu__item--static');
    var OPENED_CLASS = 'opened';
    var OVERLAY_CLASS = 'overlay';
    function hamburgerToggle() {
      $btn.on('click', function switcher() {
        $(this).toggleClass(OPENED_CLASS);
        $menu.toggleClass(OPENED_CLASS);
        $body.toggleClass(OVERLAY_CLASS);
        $submenu.removeClass(OPENED_CLASS);
      });
    }
    function submenuToggle() {
      $submenuLink.on('click', function (event) {
        event.preventDefault();
        $submenu.toggleClass(OPENED_CLASS);
      });
      $submenuClose.on('click', function (event) {
        event.preventDefault();
        $submenu.toggleClass(OPENED_CLASS);
      });
    }
    function init() {
      if (!$btn.length) return;
      hamburgerToggle();
      if (!$submenu.length) return;
      submenuToggle();
    }
    return {
      init: init()
    };
  }
};

exports.default = hamburger;

},{}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var pageScroll = {
  smoothScrolling: function smoothScrolling() {
    var $window = $(window);
    var $page = $('html, body');
    var $body = $('body');
    var $menu = $('.menu');
    var $anchorLink = $('a[href^="#"]');
    var ANIMATION_SPEED = 400;
    var HEADER_HEIGHT = 0;
    var OVERFLOW_CLASS = 'overflow-hidden';
    var MOBILE_VIEW_ON = 1024;
    function scrolling() {
      $anchorLink.on('click', function scrollTo(event) {
        event.preventDefault();
        var $position = $($.attr(this, 'href')).offset().top;
        $page.animate({
          scrollTop: $position - HEADER_HEIGHT + 'px'
        }, ANIMATION_SPEED);
        if ($window.width() <= MOBILE_VIEW_ON) {
          $menu.fadeOut();
          $body.removeClass(OVERFLOW_CLASS);
        }
        return false;
      });
    }
    function init() {
      if (!$page.length) return;
      scrolling();
    }
    return {
      init: init()
    };
  }
};

exports.default = pageScroll;

},{}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var pageTransition = {
  transition: function transition() {
    var $body = $('body');
    var $navLink = $('.menu__link');
    var $blogLink = $('.blog__post a');
    var $backLink = $('.back-to-blog');
    function pageOnLoad() {
      $body.fadeIn(1000);
    }
    function fadeOutOnClick(link) {
      link.on('click', function (event) {
        event.preventDefault();
        var linkLocation = this.href;
        $body.fadeOut(1000, function () {
          window.location = linkLocation;
        });
      });
    }
    function init() {
      if (!$body.length) return;
      $(window).on('load', pageOnLoad());
      fadeOutOnClick($navLink);
      fadeOutOnClick($blogLink);
      fadeOutOnClick($backLink);
    }
    return {
      init: init()
    };
  }
};

exports.default = pageTransition;

},{}]},{},[3])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvaGlnaGxpZ2h0LmpzL2xpYi9oaWdobGlnaHQuanMiLCJub2RlX21vZHVsZXMvaGlnaGxpZ2h0LmpzL2xpYi9sYW5ndWFnZXMvamF2YXNjcmlwdC5qcyIsInRoZW1lcy9wcm9qZWN0X3RoZW1lL3NyYy9qcy9hcHAuanMiLCJ0aGVtZXMvcHJvamVjdF90aGVtZS9zcmMvanMvbW9kdWxlcy9oYW1idXJnZXIuanMiLCJ0aGVtZXMvcHJvamVjdF90aGVtZS9zcmMvanMvbW9kdWxlcy9wYWdlU2Nyb2xsLmpzIiwidGhlbWVzL3Byb2plY3RfdGhlbWUvc3JjL2pzL21vZHVsZXMvcGFnZVRyYW5zaXRpb24uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RnQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDbE1BOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7OztBQUVBLENBQUMsVUFBQyxDQUFELEVBQU87QUFDTjtBQUNBLElBQUUsWUFBTTtBQUNOLDZCQUFlLFVBQWY7QUFDQSxNQUFFLGNBQUYsRUFBa0IsSUFBbEIsTUFBMEIsSUFBSSxJQUFKLEdBQVcsV0FBWCxFQUExQjtBQUNBLHlCQUFXLGVBQVg7QUFDQSx3QkFBVSxPQUFWO0FBQ0Esd0JBQUssZ0JBQUwsQ0FBc0IsWUFBdEIsRUFBb0Msb0JBQXBDO0FBQ0Esd0JBQUssc0JBQUw7QUFDRCxHQVBEO0FBUUQsQ0FWRCxFQVVHLE1BVkgsRSxDQVpBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOzs7Ozs7OztBQ0xBLElBQU0sWUFBWTtBQUNoQixTQURnQixxQkFDTjtBQUNSLFFBQU0sUUFBUSxFQUFFLE1BQUYsQ0FBZDtBQUNBLFFBQU0sT0FBTyxFQUFFLFlBQUYsQ0FBYjtBQUNBLFFBQU0sUUFBUSxFQUFFLE9BQUYsQ0FBZDtBQUNBLFFBQU0sV0FBVyxFQUFFLFVBQUYsQ0FBakI7QUFDQSxRQUFNLGVBQWUsRUFBRSxzQkFBRixDQUFyQjtBQUNBLFFBQU0sZ0JBQWdCLEVBQUUsd0JBQUYsQ0FBdEI7QUFDQSxRQUFNLGVBQWUsUUFBckI7QUFDQSxRQUFNLGdCQUFnQixTQUF0QjtBQUNBLGFBQVMsZUFBVCxHQUEyQjtBQUN6QixXQUFLLEVBQUwsQ0FBUSxPQUFSLEVBQWlCLFNBQVMsUUFBVCxHQUFvQjtBQUNuQyxVQUFFLElBQUYsRUFBUSxXQUFSLENBQW9CLFlBQXBCO0FBQ0EsY0FBTSxXQUFOLENBQWtCLFlBQWxCO0FBQ0EsY0FBTSxXQUFOLENBQWtCLGFBQWxCO0FBQ0EsaUJBQVMsV0FBVCxDQUFxQixZQUFyQjtBQUNELE9BTEQ7QUFNRDtBQUNELGFBQVMsYUFBVCxHQUF5QjtBQUN2QixtQkFBYSxFQUFiLENBQWdCLE9BQWhCLEVBQXlCLFVBQUMsS0FBRCxFQUFXO0FBQ2xDLGNBQU0sY0FBTjtBQUNBLGlCQUFTLFdBQVQsQ0FBcUIsWUFBckI7QUFDRCxPQUhEO0FBSUEsb0JBQWMsRUFBZCxDQUFpQixPQUFqQixFQUEwQixVQUFDLEtBQUQsRUFBVztBQUNuQyxjQUFNLGNBQU47QUFDQSxpQkFBUyxXQUFULENBQXFCLFlBQXJCO0FBQ0QsT0FIRDtBQUlEO0FBQ0QsYUFBUyxJQUFULEdBQWdCO0FBQ2QsVUFBSSxDQUFDLEtBQUssTUFBVixFQUFrQjtBQUNsQjtBQUNBLFVBQUksQ0FBQyxTQUFTLE1BQWQsRUFBc0I7QUFDdEI7QUFDRDtBQUNELFdBQU87QUFDTCxZQUFNO0FBREQsS0FBUDtBQUdEO0FBckNlLENBQWxCOztrQkF3Q2UsUzs7Ozs7Ozs7QUN4Q2YsSUFBTSxhQUFhO0FBQ2pCLGlCQURpQiw2QkFDQztBQUNoQixRQUFNLFVBQVUsRUFBRSxNQUFGLENBQWhCO0FBQ0EsUUFBTSxRQUFRLEVBQUUsWUFBRixDQUFkO0FBQ0EsUUFBTSxRQUFRLEVBQUUsTUFBRixDQUFkO0FBQ0EsUUFBTSxRQUFRLEVBQUUsT0FBRixDQUFkO0FBQ0EsUUFBTSxjQUFjLEVBQUUsY0FBRixDQUFwQjtBQUNBLFFBQU0sa0JBQWtCLEdBQXhCO0FBQ0EsUUFBTSxnQkFBZ0IsQ0FBdEI7QUFDQSxRQUFNLGlCQUFpQixpQkFBdkI7QUFDQSxRQUFNLGlCQUFpQixJQUF2QjtBQUNBLGFBQVMsU0FBVCxHQUFxQjtBQUNuQixrQkFBWSxFQUFaLENBQWUsT0FBZixFQUF3QixTQUFTLFFBQVQsQ0FBa0IsS0FBbEIsRUFBeUI7QUFDL0MsY0FBTSxjQUFOO0FBQ0EsWUFBTSxZQUFZLEVBQUUsRUFBRSxJQUFGLENBQU8sSUFBUCxFQUFhLE1BQWIsQ0FBRixFQUF3QixNQUF4QixHQUFpQyxHQUFuRDtBQUNBLGNBQU0sT0FBTixDQUFjO0FBQ1oscUJBQWMsWUFBWSxhQUExQjtBQURZLFNBQWQsRUFFRyxlQUZIO0FBR0EsWUFBSSxRQUFRLEtBQVIsTUFBbUIsY0FBdkIsRUFBdUM7QUFDckMsZ0JBQU0sT0FBTjtBQUNBLGdCQUFNLFdBQU4sQ0FBa0IsY0FBbEI7QUFDRDtBQUNELGVBQU8sS0FBUDtBQUNELE9BWEQ7QUFZRDtBQUNELGFBQVMsSUFBVCxHQUFnQjtBQUNkLFVBQUksQ0FBQyxNQUFNLE1BQVgsRUFBbUI7QUFDbkI7QUFDRDtBQUNELFdBQU87QUFDTCxZQUFNO0FBREQsS0FBUDtBQUdEO0FBaENnQixDQUFuQjs7a0JBbUNlLFU7Ozs7Ozs7O0FDbkNmLElBQU0saUJBQWlCO0FBQ3JCLFlBRHFCLHdCQUNSO0FBQ1gsUUFBTSxRQUFRLEVBQUUsTUFBRixDQUFkO0FBQ0EsUUFBTSxXQUFXLEVBQUUsYUFBRixDQUFqQjtBQUNBLFFBQU0sWUFBWSxFQUFFLGVBQUYsQ0FBbEI7QUFDQSxRQUFNLFlBQVksRUFBRSxlQUFGLENBQWxCO0FBQ0EsYUFBUyxVQUFULEdBQXNCO0FBQ3BCLFlBQU0sTUFBTixDQUFhLElBQWI7QUFDRDtBQUNELGFBQVMsY0FBVCxDQUF3QixJQUF4QixFQUE4QjtBQUM1QixXQUFLLEVBQUwsQ0FBUSxPQUFSLEVBQWlCLFVBQVUsS0FBVixFQUFpQjtBQUNoQyxjQUFNLGNBQU47QUFDQSxZQUFNLGVBQWUsS0FBSyxJQUExQjtBQUNBLGNBQU0sT0FBTixDQUFjLElBQWQsRUFBb0IsWUFBTTtBQUN4QixpQkFBTyxRQUFQLEdBQWtCLFlBQWxCO0FBQ0QsU0FGRDtBQUdELE9BTkQ7QUFPRDtBQUNELGFBQVMsSUFBVCxHQUFnQjtBQUNkLFVBQUksQ0FBQyxNQUFNLE1BQVgsRUFBbUI7QUFDbkIsUUFBRSxNQUFGLEVBQVUsRUFBVixDQUFhLE1BQWIsRUFBcUIsWUFBckI7QUFDQSxxQkFBZSxRQUFmO0FBQ0EscUJBQWUsU0FBZjtBQUNBLHFCQUFlLFNBQWY7QUFDRDtBQUNELFdBQU87QUFDTCxZQUFNO0FBREQsS0FBUDtBQUdEO0FBNUJvQixDQUF2Qjs7a0JBK0JlLGMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIvKlxuU3ludGF4IGhpZ2hsaWdodGluZyB3aXRoIGxhbmd1YWdlIGF1dG9kZXRlY3Rpb24uXG5odHRwczovL2hpZ2hsaWdodGpzLm9yZy9cbiovXG5cbihmdW5jdGlvbihmYWN0b3J5KSB7XG5cbiAgLy8gRmluZCB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgZXhwb3J0IHRvIGJvdGggdGhlIGJyb3dzZXIgYW5kIHdlYiB3b3JrZXJzLlxuICB2YXIgZ2xvYmFsT2JqZWN0ID0gdHlwZW9mIHdpbmRvdyA9PT0gJ29iamVjdCcgJiYgd2luZG93IHx8XG4gICAgICAgICAgICAgICAgICAgICB0eXBlb2Ygc2VsZiA9PT0gJ29iamVjdCcgJiYgc2VsZjtcblxuICAvLyBTZXR1cCBoaWdobGlnaHQuanMgZm9yIGRpZmZlcmVudCBlbnZpcm9ubWVudHMuIEZpcnN0IGlzIE5vZGUuanMgb3JcbiAgLy8gQ29tbW9uSlMuXG4gIC8vIGBub2RlVHlwZWAgaXMgY2hlY2tlZCB0byBlbnN1cmUgdGhhdCBgZXhwb3J0c2AgaXMgbm90IGEgSFRNTCBlbGVtZW50LlxuICBpZih0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcgJiYgIWV4cG9ydHMubm9kZVR5cGUpIHtcbiAgICBmYWN0b3J5KGV4cG9ydHMpO1xuICB9IGVsc2UgaWYoZ2xvYmFsT2JqZWN0KSB7XG4gICAgLy8gRXhwb3J0IGhsanMgZ2xvYmFsbHkgZXZlbiB3aGVuIHVzaW5nIEFNRCBmb3IgY2FzZXMgd2hlbiB0aGlzIHNjcmlwdFxuICAgIC8vIGlzIGxvYWRlZCB3aXRoIG90aGVycyB0aGF0IG1heSBzdGlsbCBleHBlY3QgYSBnbG9iYWwgaGxqcy5cbiAgICBnbG9iYWxPYmplY3QuaGxqcyA9IGZhY3Rvcnkoe30pO1xuXG4gICAgLy8gRmluYWxseSByZWdpc3RlciB0aGUgZ2xvYmFsIGhsanMgd2l0aCBBTUQuXG4gICAgaWYodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICBkZWZpbmUoW10sIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gZ2xvYmFsT2JqZWN0LmhsanM7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxufShmdW5jdGlvbihobGpzKSB7XG4gIC8vIENvbnZlbmllbmNlIHZhcmlhYmxlcyBmb3IgYnVpbGQtaW4gb2JqZWN0c1xuICB2YXIgQXJyYXlQcm90byA9IFtdLFxuICAgICAgb2JqZWN0S2V5cyA9IE9iamVjdC5rZXlzO1xuXG4gIC8vIEdsb2JhbCBpbnRlcm5hbCB2YXJpYWJsZXMgdXNlZCB3aXRoaW4gdGhlIGhpZ2hsaWdodC5qcyBsaWJyYXJ5LlxuICB2YXIgbGFuZ3VhZ2VzID0ge30sXG4gICAgICBhbGlhc2VzICAgPSB7fTtcblxuICAvLyBSZWd1bGFyIGV4cHJlc3Npb25zIHVzZWQgdGhyb3VnaG91dCB0aGUgaGlnaGxpZ2h0LmpzIGxpYnJhcnkuXG4gIHZhciBub0hpZ2hsaWdodFJlICAgID0gL14obm8tP2hpZ2hsaWdodHxwbGFpbnx0ZXh0KSQvaSxcbiAgICAgIGxhbmd1YWdlUHJlZml4UmUgPSAvXFxibGFuZyg/OnVhZ2UpPy0oW1xcdy1dKylcXGIvaSxcbiAgICAgIGZpeE1hcmt1cFJlICAgICAgPSAvKCheKDxbXj5dKz58XFx0fCkrfCg/OlxcbikpKS9nbTtcblxuICAvLyBUaGUgb2JqZWN0IHdpbGwgYmUgYXNzaWduZWQgYnkgdGhlIGJ1aWxkIHRvb2wuIEl0IHVzZWQgdG8gc3luY2hyb25pemUgQVBJXG4gIC8vIG9mIGV4dGVybmFsIGxhbmd1YWdlIGZpbGVzIHdpdGggbWluaWZpZWQgdmVyc2lvbiBvZiB0aGUgaGlnaGxpZ2h0LmpzIGxpYnJhcnkuXG4gIHZhciBBUElfUkVQTEFDRVM7XG5cbiAgdmFyIHNwYW5FbmRUYWcgPSAnPC9zcGFuPic7XG5cbiAgLy8gR2xvYmFsIG9wdGlvbnMgdXNlZCB3aGVuIHdpdGhpbiBleHRlcm5hbCBBUElzLiBUaGlzIGlzIG1vZGlmaWVkIHdoZW5cbiAgLy8gY2FsbGluZyB0aGUgYGhsanMuY29uZmlndXJlYCBmdW5jdGlvbi5cbiAgdmFyIG9wdGlvbnMgPSB7XG4gICAgY2xhc3NQcmVmaXg6ICdobGpzLScsXG4gICAgdGFiUmVwbGFjZTogbnVsbCxcbiAgICB1c2VCUjogZmFsc2UsXG4gICAgbGFuZ3VhZ2VzOiB1bmRlZmluZWRcbiAgfTtcblxuICAvLyBrZXl3b3JkcyB0aGF0IHNob3VsZCBoYXZlIG5vIGRlZmF1bHQgcmVsZXZhbmNlIHZhbHVlXG4gIHZhciBDT01NT05fS0VZV09SRFMgPSAnb2YgYW5kIGZvciBpbiBub3Qgb3IgaWYgdGhlbicuc3BsaXQoJyAnKVxuXG5cbiAgLyogVXRpbGl0eSBmdW5jdGlvbnMgKi9cblxuICBmdW5jdGlvbiBlc2NhcGUodmFsdWUpIHtcbiAgICByZXR1cm4gdmFsdWUucmVwbGFjZSgvJi9nLCAnJmFtcDsnKS5yZXBsYWNlKC88L2csICcmbHQ7JykucmVwbGFjZSgvPi9nLCAnJmd0OycpO1xuICB9XG5cbiAgZnVuY3Rpb24gdGFnKG5vZGUpIHtcbiAgICByZXR1cm4gbm9kZS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gdGVzdFJlKHJlLCBsZXhlbWUpIHtcbiAgICB2YXIgbWF0Y2ggPSByZSAmJiByZS5leGVjKGxleGVtZSk7XG4gICAgcmV0dXJuIG1hdGNoICYmIG1hdGNoLmluZGV4ID09PSAwO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNOb3RIaWdobGlnaHRlZChsYW5ndWFnZSkge1xuICAgIHJldHVybiBub0hpZ2hsaWdodFJlLnRlc3QobGFuZ3VhZ2UpO1xuICB9XG5cbiAgZnVuY3Rpb24gYmxvY2tMYW5ndWFnZShibG9jaykge1xuICAgIHZhciBpLCBtYXRjaCwgbGVuZ3RoLCBfY2xhc3M7XG4gICAgdmFyIGNsYXNzZXMgPSBibG9jay5jbGFzc05hbWUgKyAnICc7XG5cbiAgICBjbGFzc2VzICs9IGJsb2NrLnBhcmVudE5vZGUgPyBibG9jay5wYXJlbnROb2RlLmNsYXNzTmFtZSA6ICcnO1xuXG4gICAgLy8gbGFuZ3VhZ2UtKiB0YWtlcyBwcmVjZWRlbmNlIG92ZXIgbm9uLXByZWZpeGVkIGNsYXNzIG5hbWVzLlxuICAgIG1hdGNoID0gbGFuZ3VhZ2VQcmVmaXhSZS5leGVjKGNsYXNzZXMpO1xuICAgIGlmIChtYXRjaCkge1xuICAgICAgcmV0dXJuIGdldExhbmd1YWdlKG1hdGNoWzFdKSA/IG1hdGNoWzFdIDogJ25vLWhpZ2hsaWdodCc7XG4gICAgfVxuXG4gICAgY2xhc3NlcyA9IGNsYXNzZXMuc3BsaXQoL1xccysvKTtcblxuICAgIGZvciAoaSA9IDAsIGxlbmd0aCA9IGNsYXNzZXMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIF9jbGFzcyA9IGNsYXNzZXNbaV07XG5cbiAgICAgIGlmIChpc05vdEhpZ2hsaWdodGVkKF9jbGFzcykgfHwgZ2V0TGFuZ3VhZ2UoX2NsYXNzKSkge1xuICAgICAgICByZXR1cm4gX2NsYXNzO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGluaGVyaXQocGFyZW50KSB7ICAvLyBpbmhlcml0KHBhcmVudCwgb3ZlcnJpZGVfb2JqLCBvdmVycmlkZV9vYmosIC4uLilcbiAgICB2YXIga2V5O1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICB2YXIgb2JqZWN0cyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG5cbiAgICBmb3IgKGtleSBpbiBwYXJlbnQpXG4gICAgICByZXN1bHRba2V5XSA9IHBhcmVudFtrZXldO1xuICAgIG9iamVjdHMuZm9yRWFjaChmdW5jdGlvbihvYmopIHtcbiAgICAgIGZvciAoa2V5IGluIG9iailcbiAgICAgICAgcmVzdWx0W2tleV0gPSBvYmpba2V5XTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyogU3RyZWFtIG1lcmdpbmcgKi9cblxuICBmdW5jdGlvbiBub2RlU3RyZWFtKG5vZGUpIHtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgKGZ1bmN0aW9uIF9ub2RlU3RyZWFtKG5vZGUsIG9mZnNldCkge1xuICAgICAgZm9yICh2YXIgY2hpbGQgPSBub2RlLmZpcnN0Q2hpbGQ7IGNoaWxkOyBjaGlsZCA9IGNoaWxkLm5leHRTaWJsaW5nKSB7XG4gICAgICAgIGlmIChjaGlsZC5ub2RlVHlwZSA9PT0gMylcbiAgICAgICAgICBvZmZzZXQgKz0gY2hpbGQubm9kZVZhbHVlLmxlbmd0aDtcbiAgICAgICAgZWxzZSBpZiAoY2hpbGQubm9kZVR5cGUgPT09IDEpIHtcbiAgICAgICAgICByZXN1bHQucHVzaCh7XG4gICAgICAgICAgICBldmVudDogJ3N0YXJ0JyxcbiAgICAgICAgICAgIG9mZnNldDogb2Zmc2V0LFxuICAgICAgICAgICAgbm9kZTogY2hpbGRcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBvZmZzZXQgPSBfbm9kZVN0cmVhbShjaGlsZCwgb2Zmc2V0KTtcbiAgICAgICAgICAvLyBQcmV2ZW50IHZvaWQgZWxlbWVudHMgZnJvbSBoYXZpbmcgYW4gZW5kIHRhZyB0aGF0IHdvdWxkIGFjdHVhbGx5XG4gICAgICAgICAgLy8gZG91YmxlIHRoZW0gaW4gdGhlIG91dHB1dC4gVGhlcmUgYXJlIG1vcmUgdm9pZCBlbGVtZW50cyBpbiBIVE1MXG4gICAgICAgICAgLy8gYnV0IHdlIGxpc3Qgb25seSB0aG9zZSByZWFsaXN0aWNhbGx5IGV4cGVjdGVkIGluIGNvZGUgZGlzcGxheS5cbiAgICAgICAgICBpZiAoIXRhZyhjaGlsZCkubWF0Y2goL2JyfGhyfGltZ3xpbnB1dC8pKSB7XG4gICAgICAgICAgICByZXN1bHQucHVzaCh7XG4gICAgICAgICAgICAgIGV2ZW50OiAnc3RvcCcsXG4gICAgICAgICAgICAgIG9mZnNldDogb2Zmc2V0LFxuICAgICAgICAgICAgICBub2RlOiBjaGlsZFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gb2Zmc2V0O1xuICAgIH0pKG5vZGUsIDApO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBmdW5jdGlvbiBtZXJnZVN0cmVhbXMob3JpZ2luYWwsIGhpZ2hsaWdodGVkLCB2YWx1ZSkge1xuICAgIHZhciBwcm9jZXNzZWQgPSAwO1xuICAgIHZhciByZXN1bHQgPSAnJztcbiAgICB2YXIgbm9kZVN0YWNrID0gW107XG5cbiAgICBmdW5jdGlvbiBzZWxlY3RTdHJlYW0oKSB7XG4gICAgICBpZiAoIW9yaWdpbmFsLmxlbmd0aCB8fCAhaGlnaGxpZ2h0ZWQubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBvcmlnaW5hbC5sZW5ndGggPyBvcmlnaW5hbCA6IGhpZ2hsaWdodGVkO1xuICAgICAgfVxuICAgICAgaWYgKG9yaWdpbmFsWzBdLm9mZnNldCAhPT0gaGlnaGxpZ2h0ZWRbMF0ub2Zmc2V0KSB7XG4gICAgICAgIHJldHVybiAob3JpZ2luYWxbMF0ub2Zmc2V0IDwgaGlnaGxpZ2h0ZWRbMF0ub2Zmc2V0KSA/IG9yaWdpbmFsIDogaGlnaGxpZ2h0ZWQ7XG4gICAgICB9XG5cbiAgICAgIC8qXG4gICAgICBUbyBhdm9pZCBzdGFydGluZyB0aGUgc3RyZWFtIGp1c3QgYmVmb3JlIGl0IHNob3VsZCBzdG9wIHRoZSBvcmRlciBpc1xuICAgICAgZW5zdXJlZCB0aGF0IG9yaWdpbmFsIGFsd2F5cyBzdGFydHMgZmlyc3QgYW5kIGNsb3NlcyBsYXN0OlxuXG4gICAgICBpZiAoZXZlbnQxID09ICdzdGFydCcgJiYgZXZlbnQyID09ICdzdGFydCcpXG4gICAgICAgIHJldHVybiBvcmlnaW5hbDtcbiAgICAgIGlmIChldmVudDEgPT0gJ3N0YXJ0JyAmJiBldmVudDIgPT0gJ3N0b3AnKVxuICAgICAgICByZXR1cm4gaGlnaGxpZ2h0ZWQ7XG4gICAgICBpZiAoZXZlbnQxID09ICdzdG9wJyAmJiBldmVudDIgPT0gJ3N0YXJ0JylcbiAgICAgICAgcmV0dXJuIG9yaWdpbmFsO1xuICAgICAgaWYgKGV2ZW50MSA9PSAnc3RvcCcgJiYgZXZlbnQyID09ICdzdG9wJylcbiAgICAgICAgcmV0dXJuIGhpZ2hsaWdodGVkO1xuXG4gICAgICAuLi4gd2hpY2ggaXMgY29sbGFwc2VkIHRvOlxuICAgICAgKi9cbiAgICAgIHJldHVybiBoaWdobGlnaHRlZFswXS5ldmVudCA9PT0gJ3N0YXJ0JyA/IG9yaWdpbmFsIDogaGlnaGxpZ2h0ZWQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb3Blbihub2RlKSB7XG4gICAgICBmdW5jdGlvbiBhdHRyX3N0cihhKSB7cmV0dXJuICcgJyArIGEubm9kZU5hbWUgKyAnPVwiJyArIGVzY2FwZShhLnZhbHVlKS5yZXBsYWNlKCdcIicsICcmcXVvdDsnKSArICdcIic7fVxuICAgICAgcmVzdWx0ICs9ICc8JyArIHRhZyhub2RlKSArIEFycmF5UHJvdG8ubWFwLmNhbGwobm9kZS5hdHRyaWJ1dGVzLCBhdHRyX3N0cikuam9pbignJykgKyAnPic7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2xvc2Uobm9kZSkge1xuICAgICAgcmVzdWx0ICs9ICc8LycgKyB0YWcobm9kZSkgKyAnPic7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVuZGVyKGV2ZW50KSB7XG4gICAgICAoZXZlbnQuZXZlbnQgPT09ICdzdGFydCcgPyBvcGVuIDogY2xvc2UpKGV2ZW50Lm5vZGUpO1xuICAgIH1cblxuICAgIHdoaWxlIChvcmlnaW5hbC5sZW5ndGggfHwgaGlnaGxpZ2h0ZWQubGVuZ3RoKSB7XG4gICAgICB2YXIgc3RyZWFtID0gc2VsZWN0U3RyZWFtKCk7XG4gICAgICByZXN1bHQgKz0gZXNjYXBlKHZhbHVlLnN1YnN0cmluZyhwcm9jZXNzZWQsIHN0cmVhbVswXS5vZmZzZXQpKTtcbiAgICAgIHByb2Nlc3NlZCA9IHN0cmVhbVswXS5vZmZzZXQ7XG4gICAgICBpZiAoc3RyZWFtID09PSBvcmlnaW5hbCkge1xuICAgICAgICAvKlxuICAgICAgICBPbiBhbnkgb3BlbmluZyBvciBjbG9zaW5nIHRhZyBvZiB0aGUgb3JpZ2luYWwgbWFya3VwIHdlIGZpcnN0IGNsb3NlXG4gICAgICAgIHRoZSBlbnRpcmUgaGlnaGxpZ2h0ZWQgbm9kZSBzdGFjaywgdGhlbiByZW5kZXIgdGhlIG9yaWdpbmFsIHRhZyBhbG9uZ1xuICAgICAgICB3aXRoIGFsbCB0aGUgZm9sbG93aW5nIG9yaWdpbmFsIHRhZ3MgYXQgdGhlIHNhbWUgb2Zmc2V0IGFuZCB0aGVuXG4gICAgICAgIHJlb3BlbiBhbGwgdGhlIHRhZ3Mgb24gdGhlIGhpZ2hsaWdodGVkIHN0YWNrLlxuICAgICAgICAqL1xuICAgICAgICBub2RlU3RhY2sucmV2ZXJzZSgpLmZvckVhY2goY2xvc2UpO1xuICAgICAgICBkbyB7XG4gICAgICAgICAgcmVuZGVyKHN0cmVhbS5zcGxpY2UoMCwgMSlbMF0pO1xuICAgICAgICAgIHN0cmVhbSA9IHNlbGVjdFN0cmVhbSgpO1xuICAgICAgICB9IHdoaWxlIChzdHJlYW0gPT09IG9yaWdpbmFsICYmIHN0cmVhbS5sZW5ndGggJiYgc3RyZWFtWzBdLm9mZnNldCA9PT0gcHJvY2Vzc2VkKTtcbiAgICAgICAgbm9kZVN0YWNrLnJldmVyc2UoKS5mb3JFYWNoKG9wZW4pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHN0cmVhbVswXS5ldmVudCA9PT0gJ3N0YXJ0Jykge1xuICAgICAgICAgIG5vZGVTdGFjay5wdXNoKHN0cmVhbVswXS5ub2RlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBub2RlU3RhY2sucG9wKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmVuZGVyKHN0cmVhbS5zcGxpY2UoMCwgMSlbMF0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0ICsgZXNjYXBlKHZhbHVlLnN1YnN0cihwcm9jZXNzZWQpKTtcbiAgfVxuXG4gIC8qIEluaXRpYWxpemF0aW9uICovXG5cbiAgZnVuY3Rpb24gZGVwZW5kZW5jeU9uUGFyZW50KG1vZGUpIHtcbiAgICBpZiAoIW1vZGUpIHJldHVybiBmYWxzZTtcblxuICAgIHJldHVybiBtb2RlLmVuZHNXaXRoUGFyZW50IHx8IGRlcGVuZGVuY3lPblBhcmVudChtb2RlLnN0YXJ0cylcbiAgfVxuXG4gIGZ1bmN0aW9uIGV4cGFuZF9vcl9jbG9uZV9tb2RlKG1vZGUpIHtcbiAgICBpZiAobW9kZS52YXJpYW50cyAmJiAhbW9kZS5jYWNoZWRfdmFyaWFudHMpIHtcbiAgICAgIG1vZGUuY2FjaGVkX3ZhcmlhbnRzID0gbW9kZS52YXJpYW50cy5tYXAoZnVuY3Rpb24odmFyaWFudCkge1xuICAgICAgICByZXR1cm4gaW5oZXJpdChtb2RlLCB7dmFyaWFudHM6IG51bGx9LCB2YXJpYW50KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEVYUEFORFxuICAgIC8vIGlmIHdlIGhhdmUgdmFyaWFudHMgdGhlbiBlc3NlbnR1YWxseSBcInJlcGxhY2VcIiB0aGUgbW9kZSB3aXRoIHRoZSB2YXJpYW50c1xuICAgIC8vIHRoaXMgaGFwcGVucyBpbiBjb21waWxlTW9kZSwgd2hlcmUgdGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgZnJvbVxuICAgIGlmIChtb2RlLmNhY2hlZF92YXJpYW50cylcbiAgICAgIHJldHVybiBtb2RlLmNhY2hlZF92YXJpYW50cztcblxuICAgIC8vIENMT05FXG4gICAgLy8gaWYgd2UgaGF2ZSBkZXBlbmRlbmNpZXMgb24gcGFyZW50cyB0aGVuIHdlIG5lZWQgYSB1bmlxdWVcbiAgICAvLyBpbnN0YW5jZSBvZiBvdXJzZWx2ZXMsIHNvIHdlIGNhbiBiZSByZXVzZWQgd2l0aCBtYW55XG4gICAgLy8gZGlmZmVyZW50IHBhcmVudHMgd2l0aG91dCBpc3N1ZVxuICAgIGlmIChkZXBlbmRlbmN5T25QYXJlbnQobW9kZSkpXG4gICAgICByZXR1cm4gW2luaGVyaXQobW9kZSwgeyBzdGFydHM6IG1vZGUuc3RhcnRzID8gaW5oZXJpdChtb2RlLnN0YXJ0cykgOiBudWxsIH0pXVxuXG4gICAgLy8gbm8gc3BlY2lhbCBkZXBlbmRlbmN5IGlzc3VlcywganVzdCByZXR1cm4gb3Vyc2VsdmVzXG4gICAgcmV0dXJuIFttb2RlXVxuICB9XG5cbiAgZnVuY3Rpb24gcmVzdG9yZUxhbmd1YWdlQXBpKG9iaikge1xuICAgIGlmKEFQSV9SRVBMQUNFUyAmJiAhb2JqLmxhbmdBcGlSZXN0b3JlZCkge1xuICAgICAgb2JqLmxhbmdBcGlSZXN0b3JlZCA9IHRydWU7XG4gICAgICBmb3IodmFyIGtleSBpbiBBUElfUkVQTEFDRVMpXG4gICAgICAgIG9ialtrZXldICYmIChvYmpbQVBJX1JFUExBQ0VTW2tleV1dID0gb2JqW2tleV0pO1xuICAgICAgKG9iai5jb250YWlucyB8fCBbXSkuY29uY2F0KG9iai52YXJpYW50cyB8fCBbXSkuZm9yRWFjaChyZXN0b3JlTGFuZ3VhZ2VBcGkpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbXBpbGVLZXl3b3JkcyhyYXdLZXl3b3JkcywgY2FzZV9pbnNlbnNpdGl2ZSkge1xuICAgICAgdmFyIGNvbXBpbGVkX2tleXdvcmRzID0ge307XG5cbiAgICAgIGlmICh0eXBlb2YgcmF3S2V5d29yZHMgPT09ICdzdHJpbmcnKSB7IC8vIHN0cmluZ1xuICAgICAgICBzcGxpdEFuZENvbXBpbGUoJ2tleXdvcmQnLCByYXdLZXl3b3Jkcyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvYmplY3RLZXlzKHJhd0tleXdvcmRzKS5mb3JFYWNoKGZ1bmN0aW9uIChjbGFzc05hbWUpIHtcbiAgICAgICAgICBzcGxpdEFuZENvbXBpbGUoY2xhc3NOYW1lLCByYXdLZXl3b3Jkc1tjbGFzc05hbWVdKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgcmV0dXJuIGNvbXBpbGVkX2tleXdvcmRzO1xuXG4gICAgLy8gLS0tXG5cbiAgICBmdW5jdGlvbiBzcGxpdEFuZENvbXBpbGUoY2xhc3NOYW1lLCBzdHIpIHtcbiAgICAgIGlmIChjYXNlX2luc2Vuc2l0aXZlKSB7XG4gICAgICAgIHN0ciA9IHN0ci50b0xvd2VyQ2FzZSgpO1xuICAgICAgfVxuICAgICAgc3RyLnNwbGl0KCcgJykuZm9yRWFjaChmdW5jdGlvbihrZXl3b3JkKSB7XG4gICAgICAgIHZhciBwYWlyID0ga2V5d29yZC5zcGxpdCgnfCcpO1xuICAgICAgICBjb21waWxlZF9rZXl3b3Jkc1twYWlyWzBdXSA9IFtjbGFzc05hbWUsIHNjb3JlRm9yS2V5d29yZChwYWlyWzBdLCBwYWlyWzFdKV07XG4gICAgICB9KTtcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gc2NvcmVGb3JLZXl3b3JkKGtleXdvcmQsIHByb3ZpZGVkU2NvcmUpIHtcbiAgICAvLyBtYW51YWwgc2NvcmVzIGFsd2F5cyB3aW4gb3ZlciBjb21tb24ga2V5d29yZHNcbiAgICAvLyBzbyB5b3UgY2FuIGZvcmNlIGEgc2NvcmUgb2YgMSBpZiB5b3UgcmVhbGx5IGluc2lzdFxuICAgIGlmIChwcm92aWRlZFNjb3JlKVxuICAgICAgcmV0dXJuIE51bWJlcihwcm92aWRlZFNjb3JlKVxuXG4gICAgcmV0dXJuIGNvbW1vbktleXdvcmQoa2V5d29yZCkgPyAwIDogMTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbW1vbktleXdvcmQod29yZCkge1xuICAgIHJldHVybiBDT01NT05fS0VZV09SRFMuaW5kZXhPZih3b3JkLnRvTG93ZXJDYXNlKCkpICE9IC0xXG4gIH1cblxuICBmdW5jdGlvbiBjb21waWxlTGFuZ3VhZ2UobGFuZ3VhZ2UpIHtcblxuICAgIGZ1bmN0aW9uIHJlU3RyKHJlKSB7XG4gICAgICAgIHJldHVybiAocmUgJiYgcmUuc291cmNlKSB8fCByZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsYW5nUmUodmFsdWUsIGdsb2JhbCkge1xuICAgICAgcmV0dXJuIG5ldyBSZWdFeHAoXG4gICAgICAgIHJlU3RyKHZhbHVlKSxcbiAgICAgICAgJ20nICsgKGxhbmd1YWdlLmNhc2VfaW5zZW5zaXRpdmUgPyAnaScgOiAnJykgKyAoZ2xvYmFsID8gJ2cnIDogJycpXG4gICAgICApO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlQ291bnRNYXRjaEdyb3VwcyhyZSkge1xuICAgICAgcmV0dXJuIChuZXcgUmVnRXhwKHJlLnRvU3RyaW5nKCkgKyAnfCcpKS5leGVjKCcnKS5sZW5ndGggLSAxO1xuICAgIH1cblxuICAgIC8vIGpvaW5SZSBsb2dpY2FsbHkgY29tcHV0ZXMgcmVnZXhwcy5qb2luKHNlcGFyYXRvciksIGJ1dCBmaXhlcyB0aGVcbiAgICAvLyBiYWNrcmVmZXJlbmNlcyBzbyB0aGV5IGNvbnRpbnVlIHRvIG1hdGNoLlxuICAgIC8vIGl0IGFsc28gcGxhY2VzIGVhY2ggaW5kaXZpZHVhbCByZWd1bGFyIGV4cHJlc3Npb24gaW50byBpdCdzIG93blxuICAgIC8vIG1hdGNoIGdyb3VwLCBrZWVwaW5nIHRyYWNrIG9mIHRoZSBzZXF1ZW5jaW5nIG9mIHRob3NlIG1hdGNoIGdyb3Vwc1xuICAgIC8vIGlzIGN1cnJlbnRseSBhbiBleGVyY2lzZSBmb3IgdGhlIGNhbGxlci4gOi0pXG4gICAgZnVuY3Rpb24gam9pblJlKHJlZ2V4cHMsIHNlcGFyYXRvcikge1xuICAgICAgLy8gYmFja3JlZmVyZW5jZVJlIG1hdGNoZXMgYW4gb3BlbiBwYXJlbnRoZXNpcyBvciBiYWNrcmVmZXJlbmNlLiBUbyBhdm9pZFxuICAgICAgLy8gYW4gaW5jb3JyZWN0IHBhcnNlLCBpdCBhZGRpdGlvbmFsbHkgbWF0Y2hlcyB0aGUgZm9sbG93aW5nOlxuICAgICAgLy8gLSBbLi4uXSBlbGVtZW50cywgd2hlcmUgdGhlIG1lYW5pbmcgb2YgcGFyZW50aGVzZXMgYW5kIGVzY2FwZXMgY2hhbmdlXG4gICAgICAvLyAtIG90aGVyIGVzY2FwZSBzZXF1ZW5jZXMsIHNvIHdlIGRvIG5vdCBtaXNwYXJzZSBlc2NhcGUgc2VxdWVuY2VzIGFzXG4gICAgICAvLyAgIGludGVyZXN0aW5nIGVsZW1lbnRzXG4gICAgICAvLyAtIG5vbi1tYXRjaGluZyBvciBsb29rYWhlYWQgcGFyZW50aGVzZXMsIHdoaWNoIGRvIG5vdCBjYXB0dXJlLiBUaGVzZVxuICAgICAgLy8gICBmb2xsb3cgdGhlICcoJyB3aXRoIGEgJz8nLlxuICAgICAgdmFyIGJhY2tyZWZlcmVuY2VSZSA9IC9cXFsoPzpbXlxcXFxcXF1dfFxcXFwuKSpcXF18XFwoXFw/P3xcXFxcKFsxLTldWzAtOV0qKXxcXFxcLi87XG4gICAgICB2YXIgbnVtQ2FwdHVyZXMgPSAwO1xuICAgICAgdmFyIHJldCA9ICcnO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCByZWdleHBzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG51bUNhcHR1cmVzICs9IDE7XG4gICAgICAgIHZhciBvZmZzZXQgPSBudW1DYXB0dXJlcztcbiAgICAgICAgdmFyIHJlID0gcmVTdHIocmVnZXhwc1tpXSk7XG4gICAgICAgIGlmIChpID4gMCkge1xuICAgICAgICAgIHJldCArPSBzZXBhcmF0b3I7XG4gICAgICAgIH1cbiAgICAgICAgcmV0ICs9IFwiKFwiO1xuICAgICAgICB3aGlsZSAocmUubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHZhciBtYXRjaCA9IGJhY2tyZWZlcmVuY2VSZS5leGVjKHJlKTtcbiAgICAgICAgICBpZiAobWF0Y2ggPT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0ICs9IHJlO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldCArPSByZS5zdWJzdHJpbmcoMCwgbWF0Y2guaW5kZXgpO1xuICAgICAgICAgIHJlID0gcmUuc3Vic3RyaW5nKG1hdGNoLmluZGV4ICsgbWF0Y2hbMF0ubGVuZ3RoKTtcbiAgICAgICAgICBpZiAobWF0Y2hbMF1bMF0gPT0gJ1xcXFwnICYmIG1hdGNoWzFdKSB7XG4gICAgICAgICAgICAvLyBBZGp1c3QgdGhlIGJhY2tyZWZlcmVuY2UuXG4gICAgICAgICAgICByZXQgKz0gJ1xcXFwnICsgU3RyaW5nKE51bWJlcihtYXRjaFsxXSkgKyBvZmZzZXQpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXQgKz0gbWF0Y2hbMF07XG4gICAgICAgICAgICBpZiAobWF0Y2hbMF0gPT0gJygnKSB7XG4gICAgICAgICAgICAgIG51bUNhcHR1cmVzKys7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldCArPSBcIilcIjtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYnVpbGRNb2RlUmVnZXgobW9kZSkge1xuXG4gICAgICB2YXIgbWF0Y2hJbmRleGVzID0ge307XG4gICAgICB2YXIgbWF0Y2hlclJlO1xuICAgICAgdmFyIHJlZ2V4ZXMgPSBbXTtcbiAgICAgIHZhciBtYXRjaGVyID0ge307XG4gICAgICB2YXIgbWF0Y2hBdCA9IDE7XG5cbiAgICAgIGZ1bmN0aW9uIGFkZFJ1bGUocnVsZSwgcmVnZXgpIHtcbiAgICAgICAgbWF0Y2hJbmRleGVzW21hdGNoQXRdID0gcnVsZTtcbiAgICAgICAgcmVnZXhlcy5wdXNoKFtydWxlLCByZWdleF0pO1xuICAgICAgICBtYXRjaEF0ICs9IHJlQ291bnRNYXRjaEdyb3VwcyhyZWdleCkgKyAxO1xuICAgICAgfVxuXG4gICAgICB2YXIgdGVybTtcbiAgICAgIGZvciAodmFyIGk9MDsgaSA8IG1vZGUuY29udGFpbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHJlO1xuICAgICAgICB0ZXJtID0gbW9kZS5jb250YWluc1tpXTtcbiAgICAgICAgaWYgKHRlcm0uYmVnaW5LZXl3b3Jkcykge1xuICAgICAgICAgIHJlID0gJ1xcXFwuPyg/OicgKyB0ZXJtLmJlZ2luICsgJylcXFxcLj8nO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlID0gdGVybS5iZWdpbjtcbiAgICAgICAgfVxuICAgICAgICBhZGRSdWxlKHRlcm0sIHJlKTtcbiAgICAgIH1cbiAgICAgIGlmIChtb2RlLnRlcm1pbmF0b3JfZW5kKVxuICAgICAgICBhZGRSdWxlKFwiZW5kXCIsIG1vZGUudGVybWluYXRvcl9lbmQpO1xuICAgICAgaWYgKG1vZGUuaWxsZWdhbClcbiAgICAgICAgYWRkUnVsZShcImlsbGVnYWxcIiwgbW9kZS5pbGxlZ2FsKTtcblxuICAgICAgdmFyIHRlcm1pbmF0b3JzID0gcmVnZXhlcy5tYXAoZnVuY3Rpb24oZWwpIHsgcmV0dXJuIGVsWzFdIH0pO1xuICAgICAgbWF0Y2hlclJlID0gbGFuZ1JlKGpvaW5SZSh0ZXJtaW5hdG9ycywgJ3wnKSwgdHJ1ZSk7XG5cbiAgICAgIG1hdGNoZXIubGFzdEluZGV4ID0gMDtcbiAgICAgIG1hdGNoZXIuZXhlYyA9IGZ1bmN0aW9uKHMpIHtcbiAgICAgICAgdmFyIHJ1bGU7XG5cbiAgICAgICAgaWYoIHJlZ2V4ZXMubGVuZ3RoID09PSAwKSByZXR1cm4gbnVsbDtcblxuICAgICAgICBtYXRjaGVyUmUubGFzdEluZGV4ID0gbWF0Y2hlci5sYXN0SW5kZXg7XG4gICAgICAgIHZhciBtYXRjaCA9IG1hdGNoZXJSZS5leGVjKHMpO1xuICAgICAgICBpZiAoIW1hdGNoKSB7IHJldHVybiBudWxsOyB9XG5cbiAgICAgICAgZm9yKHZhciBpID0gMDsgaTxtYXRjaC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChtYXRjaFtpXSAhPSB1bmRlZmluZWQgJiYgbWF0Y2hJbmRleGVzW1wiXCIgK2ldICE9IHVuZGVmaW5lZCApIHtcbiAgICAgICAgICAgIHJ1bGUgPSBtYXRjaEluZGV4ZXNbXCJcIitpXTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGlsbGVnYWwgb3IgZW5kIG1hdGNoXG4gICAgICAgIGlmICh0eXBlb2YgcnVsZSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgIG1hdGNoLnR5cGUgPSBydWxlO1xuICAgICAgICAgIG1hdGNoLmV4dHJhID0gW21vZGUuaWxsZWdhbCwgbW9kZS50ZXJtaW5hdG9yX2VuZF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbWF0Y2gudHlwZSA9IFwiYmVnaW5cIjtcbiAgICAgICAgICBtYXRjaC5ydWxlID0gcnVsZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbWF0Y2g7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBtYXRjaGVyO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNvbXBpbGVNb2RlKG1vZGUsIHBhcmVudCkge1xuICAgICAgaWYgKG1vZGUuY29tcGlsZWQpXG4gICAgICAgIHJldHVybjtcbiAgICAgIG1vZGUuY29tcGlsZWQgPSB0cnVlO1xuXG4gICAgICBtb2RlLmtleXdvcmRzID0gbW9kZS5rZXl3b3JkcyB8fCBtb2RlLmJlZ2luS2V5d29yZHM7XG4gICAgICBpZiAobW9kZS5rZXl3b3JkcylcbiAgICAgICAgbW9kZS5rZXl3b3JkcyA9IGNvbXBpbGVLZXl3b3Jkcyhtb2RlLmtleXdvcmRzLCBsYW5ndWFnZS5jYXNlX2luc2Vuc2l0aXZlKVxuXG4gICAgICBtb2RlLmxleGVtZXNSZSA9IGxhbmdSZShtb2RlLmxleGVtZXMgfHwgL1xcdysvLCB0cnVlKTtcblxuICAgICAgaWYgKHBhcmVudCkge1xuICAgICAgICBpZiAobW9kZS5iZWdpbktleXdvcmRzKSB7XG4gICAgICAgICAgbW9kZS5iZWdpbiA9ICdcXFxcYignICsgbW9kZS5iZWdpbktleXdvcmRzLnNwbGl0KCcgJykuam9pbignfCcpICsgJylcXFxcYic7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFtb2RlLmJlZ2luKVxuICAgICAgICAgIG1vZGUuYmVnaW4gPSAvXFxCfFxcYi87XG4gICAgICAgIG1vZGUuYmVnaW5SZSA9IGxhbmdSZShtb2RlLmJlZ2luKTtcbiAgICAgICAgaWYgKG1vZGUuZW5kU2FtZUFzQmVnaW4pXG4gICAgICAgICAgbW9kZS5lbmQgPSBtb2RlLmJlZ2luO1xuICAgICAgICBpZiAoIW1vZGUuZW5kICYmICFtb2RlLmVuZHNXaXRoUGFyZW50KVxuICAgICAgICAgIG1vZGUuZW5kID0gL1xcQnxcXGIvO1xuICAgICAgICBpZiAobW9kZS5lbmQpXG4gICAgICAgICAgbW9kZS5lbmRSZSA9IGxhbmdSZShtb2RlLmVuZCk7XG4gICAgICAgIG1vZGUudGVybWluYXRvcl9lbmQgPSByZVN0cihtb2RlLmVuZCkgfHwgJyc7XG4gICAgICAgIGlmIChtb2RlLmVuZHNXaXRoUGFyZW50ICYmIHBhcmVudC50ZXJtaW5hdG9yX2VuZClcbiAgICAgICAgICBtb2RlLnRlcm1pbmF0b3JfZW5kICs9IChtb2RlLmVuZCA/ICd8JyA6ICcnKSArIHBhcmVudC50ZXJtaW5hdG9yX2VuZDtcbiAgICAgIH1cbiAgICAgIGlmIChtb2RlLmlsbGVnYWwpXG4gICAgICAgIG1vZGUuaWxsZWdhbFJlID0gbGFuZ1JlKG1vZGUuaWxsZWdhbCk7XG4gICAgICBpZiAobW9kZS5yZWxldmFuY2UgPT0gbnVsbClcbiAgICAgICAgbW9kZS5yZWxldmFuY2UgPSAxO1xuICAgICAgaWYgKCFtb2RlLmNvbnRhaW5zKSB7XG4gICAgICAgIG1vZGUuY29udGFpbnMgPSBbXTtcbiAgICAgIH1cbiAgICAgIG1vZGUuY29udGFpbnMgPSBBcnJheS5wcm90b3R5cGUuY29uY2F0LmFwcGx5KFtdLCBtb2RlLmNvbnRhaW5zLm1hcChmdW5jdGlvbihjKSB7XG4gICAgICAgIHJldHVybiBleHBhbmRfb3JfY2xvbmVfbW9kZShjID09PSAnc2VsZicgPyBtb2RlIDogYyk7XG4gICAgICB9KSk7XG4gICAgICBtb2RlLmNvbnRhaW5zLmZvckVhY2goZnVuY3Rpb24oYykge2NvbXBpbGVNb2RlKGMsIG1vZGUpO30pO1xuXG4gICAgICBpZiAobW9kZS5zdGFydHMpIHtcbiAgICAgICAgY29tcGlsZU1vZGUobW9kZS5zdGFydHMsIHBhcmVudCk7XG4gICAgICB9XG5cbiAgICAgIG1vZGUudGVybWluYXRvcnMgPSBidWlsZE1vZGVSZWdleChtb2RlKTtcbiAgICB9XG5cbiAgICBjb21waWxlTW9kZShsYW5ndWFnZSk7XG4gIH1cblxuICAvKlxuICBDb3JlIGhpZ2hsaWdodGluZyBmdW5jdGlvbi4gQWNjZXB0cyBhIGxhbmd1YWdlIG5hbWUsIG9yIGFuIGFsaWFzLCBhbmQgYVxuICBzdHJpbmcgd2l0aCB0aGUgY29kZSB0byBoaWdobGlnaHQuIFJldHVybnMgYW4gb2JqZWN0IHdpdGggdGhlIGZvbGxvd2luZ1xuICBwcm9wZXJ0aWVzOlxuXG4gIC0gcmVsZXZhbmNlIChpbnQpXG4gIC0gdmFsdWUgKGFuIEhUTUwgc3RyaW5nIHdpdGggaGlnaGxpZ2h0aW5nIG1hcmt1cClcblxuICAqL1xuICBmdW5jdGlvbiBoaWdobGlnaHQobmFtZSwgdmFsdWUsIGlnbm9yZV9pbGxlZ2FscywgY29udGludWF0aW9uKSB7XG5cbiAgICBmdW5jdGlvbiBlc2NhcGVSZSh2YWx1ZSkge1xuICAgICAgcmV0dXJuIG5ldyBSZWdFeHAodmFsdWUucmVwbGFjZSgvWy1cXC9cXFxcXiQqKz8uKCl8W1xcXXt9XS9nLCAnXFxcXCQmJyksICdtJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZW5kT2ZNb2RlKG1vZGUsIGxleGVtZSkge1xuICAgICAgaWYgKHRlc3RSZShtb2RlLmVuZFJlLCBsZXhlbWUpKSB7XG4gICAgICAgIHdoaWxlIChtb2RlLmVuZHNQYXJlbnQgJiYgbW9kZS5wYXJlbnQpIHtcbiAgICAgICAgICBtb2RlID0gbW9kZS5wYXJlbnQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1vZGU7XG4gICAgICB9XG4gICAgICBpZiAobW9kZS5lbmRzV2l0aFBhcmVudCkge1xuICAgICAgICByZXR1cm4gZW5kT2ZNb2RlKG1vZGUucGFyZW50LCBsZXhlbWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGtleXdvcmRNYXRjaChtb2RlLCBtYXRjaCkge1xuICAgICAgdmFyIG1hdGNoX3N0ciA9IGxhbmd1YWdlLmNhc2VfaW5zZW5zaXRpdmUgPyBtYXRjaFswXS50b0xvd2VyQ2FzZSgpIDogbWF0Y2hbMF07XG4gICAgICByZXR1cm4gbW9kZS5rZXl3b3Jkcy5oYXNPd25Qcm9wZXJ0eShtYXRjaF9zdHIpICYmIG1vZGUua2V5d29yZHNbbWF0Y2hfc3RyXTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBidWlsZFNwYW4oY2xhc3NuYW1lLCBpbnNpZGVTcGFuLCBsZWF2ZU9wZW4sIG5vUHJlZml4KSB7XG4gICAgICBpZiAoIWxlYXZlT3BlbiAmJiBpbnNpZGVTcGFuID09PSAnJykgcmV0dXJuICcnO1xuICAgICAgaWYgKCFjbGFzc25hbWUpIHJldHVybiBpbnNpZGVTcGFuO1xuXG4gICAgICB2YXIgY2xhc3NQcmVmaXggPSBub1ByZWZpeCA/ICcnIDogb3B0aW9ucy5jbGFzc1ByZWZpeCxcbiAgICAgICAgICBvcGVuU3BhbiAgICA9ICc8c3BhbiBjbGFzcz1cIicgKyBjbGFzc1ByZWZpeCxcbiAgICAgICAgICBjbG9zZVNwYW4gICA9IGxlYXZlT3BlbiA/ICcnIDogc3BhbkVuZFRhZztcblxuICAgICAgb3BlblNwYW4gKz0gY2xhc3NuYW1lICsgJ1wiPic7XG5cbiAgICAgIHJldHVybiBvcGVuU3BhbiArIGluc2lkZVNwYW4gKyBjbG9zZVNwYW47XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcHJvY2Vzc0tleXdvcmRzKCkge1xuICAgICAgdmFyIGtleXdvcmRfbWF0Y2gsIGxhc3RfaW5kZXgsIG1hdGNoLCByZXN1bHQ7XG5cbiAgICAgIGlmICghdG9wLmtleXdvcmRzKVxuICAgICAgICByZXR1cm4gZXNjYXBlKG1vZGVfYnVmZmVyKTtcblxuICAgICAgcmVzdWx0ID0gJyc7XG4gICAgICBsYXN0X2luZGV4ID0gMDtcbiAgICAgIHRvcC5sZXhlbWVzUmUubGFzdEluZGV4ID0gMDtcbiAgICAgIG1hdGNoID0gdG9wLmxleGVtZXNSZS5leGVjKG1vZGVfYnVmZmVyKTtcblxuICAgICAgd2hpbGUgKG1hdGNoKSB7XG4gICAgICAgIHJlc3VsdCArPSBlc2NhcGUobW9kZV9idWZmZXIuc3Vic3RyaW5nKGxhc3RfaW5kZXgsIG1hdGNoLmluZGV4KSk7XG4gICAgICAgIGtleXdvcmRfbWF0Y2ggPSBrZXl3b3JkTWF0Y2godG9wLCBtYXRjaCk7XG4gICAgICAgIGlmIChrZXl3b3JkX21hdGNoKSB7XG4gICAgICAgICAgcmVsZXZhbmNlICs9IGtleXdvcmRfbWF0Y2hbMV07XG4gICAgICAgICAgcmVzdWx0ICs9IGJ1aWxkU3BhbihrZXl3b3JkX21hdGNoWzBdLCBlc2NhcGUobWF0Y2hbMF0pKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHQgKz0gZXNjYXBlKG1hdGNoWzBdKTtcbiAgICAgICAgfVxuICAgICAgICBsYXN0X2luZGV4ID0gdG9wLmxleGVtZXNSZS5sYXN0SW5kZXg7XG4gICAgICAgIG1hdGNoID0gdG9wLmxleGVtZXNSZS5leGVjKG1vZGVfYnVmZmVyKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQgKyBlc2NhcGUobW9kZV9idWZmZXIuc3Vic3RyKGxhc3RfaW5kZXgpKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwcm9jZXNzU3ViTGFuZ3VhZ2UoKSB7XG4gICAgICB2YXIgZXhwbGljaXQgPSB0eXBlb2YgdG9wLnN1Ykxhbmd1YWdlID09PSAnc3RyaW5nJztcbiAgICAgIGlmIChleHBsaWNpdCAmJiAhbGFuZ3VhZ2VzW3RvcC5zdWJMYW5ndWFnZV0pIHtcbiAgICAgICAgcmV0dXJuIGVzY2FwZShtb2RlX2J1ZmZlcik7XG4gICAgICB9XG5cbiAgICAgIHZhciByZXN1bHQgPSBleHBsaWNpdCA/XG4gICAgICAgICAgICAgICAgICAgaGlnaGxpZ2h0KHRvcC5zdWJMYW5ndWFnZSwgbW9kZV9idWZmZXIsIHRydWUsIGNvbnRpbnVhdGlvbnNbdG9wLnN1Ykxhbmd1YWdlXSkgOlxuICAgICAgICAgICAgICAgICAgIGhpZ2hsaWdodEF1dG8obW9kZV9idWZmZXIsIHRvcC5zdWJMYW5ndWFnZS5sZW5ndGggPyB0b3Auc3ViTGFuZ3VhZ2UgOiB1bmRlZmluZWQpO1xuXG4gICAgICAvLyBDb3VudGluZyBlbWJlZGRlZCBsYW5ndWFnZSBzY29yZSB0b3dhcmRzIHRoZSBob3N0IGxhbmd1YWdlIG1heSBiZSBkaXNhYmxlZFxuICAgICAgLy8gd2l0aCB6ZXJvaW5nIHRoZSBjb250YWluaW5nIG1vZGUgcmVsZXZhbmNlLiBVc2VjYXNlIGluIHBvaW50IGlzIE1hcmtkb3duIHRoYXRcbiAgICAgIC8vIGFsbG93cyBYTUwgZXZlcnl3aGVyZSBhbmQgbWFrZXMgZXZlcnkgWE1MIHNuaXBwZXQgdG8gaGF2ZSBhIG11Y2ggbGFyZ2VyIE1hcmtkb3duXG4gICAgICAvLyBzY29yZS5cbiAgICAgIGlmICh0b3AucmVsZXZhbmNlID4gMCkge1xuICAgICAgICByZWxldmFuY2UgKz0gcmVzdWx0LnJlbGV2YW5jZTtcbiAgICAgIH1cbiAgICAgIGlmIChleHBsaWNpdCkge1xuICAgICAgICBjb250aW51YXRpb25zW3RvcC5zdWJMYW5ndWFnZV0gPSByZXN1bHQudG9wO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGJ1aWxkU3BhbihyZXN1bHQubGFuZ3VhZ2UsIHJlc3VsdC52YWx1ZSwgZmFsc2UsIHRydWUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHByb2Nlc3NCdWZmZXIoKSB7XG4gICAgICByZXN1bHQgKz0gKHRvcC5zdWJMYW5ndWFnZSAhPSBudWxsID8gcHJvY2Vzc1N1Ykxhbmd1YWdlKCkgOiBwcm9jZXNzS2V5d29yZHMoKSk7XG4gICAgICBtb2RlX2J1ZmZlciA9ICcnO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHN0YXJ0TmV3TW9kZShtb2RlKSB7XG4gICAgICByZXN1bHQgKz0gbW9kZS5jbGFzc05hbWU/IGJ1aWxkU3Bhbihtb2RlLmNsYXNzTmFtZSwgJycsIHRydWUpOiAnJztcbiAgICAgIHRvcCA9IE9iamVjdC5jcmVhdGUobW9kZSwge3BhcmVudDoge3ZhbHVlOiB0b3B9fSk7XG4gICAgfVxuXG5cbiAgICBmdW5jdGlvbiBkb0JlZ2luTWF0Y2gobWF0Y2gpIHtcbiAgICAgIHZhciBsZXhlbWUgPSBtYXRjaFswXTtcbiAgICAgIHZhciBuZXdfbW9kZSA9IG1hdGNoLnJ1bGU7XG5cbiAgICAgIGlmIChuZXdfbW9kZSAmJiBuZXdfbW9kZS5lbmRTYW1lQXNCZWdpbikge1xuICAgICAgICBuZXdfbW9kZS5lbmRSZSA9IGVzY2FwZVJlKCBsZXhlbWUgKTtcbiAgICAgIH1cblxuICAgICAgaWYgKG5ld19tb2RlLnNraXApIHtcbiAgICAgICAgbW9kZV9idWZmZXIgKz0gbGV4ZW1lO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKG5ld19tb2RlLmV4Y2x1ZGVCZWdpbikge1xuICAgICAgICAgIG1vZGVfYnVmZmVyICs9IGxleGVtZTtcbiAgICAgICAgfVxuICAgICAgICBwcm9jZXNzQnVmZmVyKCk7XG4gICAgICAgIGlmICghbmV3X21vZGUucmV0dXJuQmVnaW4gJiYgIW5ld19tb2RlLmV4Y2x1ZGVCZWdpbikge1xuICAgICAgICAgIG1vZGVfYnVmZmVyID0gbGV4ZW1lO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBzdGFydE5ld01vZGUobmV3X21vZGUsIGxleGVtZSk7XG4gICAgICByZXR1cm4gbmV3X21vZGUucmV0dXJuQmVnaW4gPyAwIDogbGV4ZW1lLmxlbmd0aDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkb0VuZE1hdGNoKG1hdGNoKSB7XG4gICAgICB2YXIgbGV4ZW1lID0gbWF0Y2hbMF07XG4gICAgICB2YXIgZW5kX21vZGUgPSBlbmRPZk1vZGUodG9wLCBsZXhlbWUpO1xuICAgICAgaWYgKCFlbmRfbW9kZSkgeyByZXR1cm47IH1cblxuICAgICAgdmFyIG9yaWdpbiA9IHRvcDtcbiAgICAgIGlmIChvcmlnaW4uc2tpcCkge1xuICAgICAgICBtb2RlX2J1ZmZlciArPSBsZXhlbWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoIShvcmlnaW4ucmV0dXJuRW5kIHx8IG9yaWdpbi5leGNsdWRlRW5kKSkge1xuICAgICAgICAgIG1vZGVfYnVmZmVyICs9IGxleGVtZTtcbiAgICAgICAgfVxuICAgICAgICBwcm9jZXNzQnVmZmVyKCk7XG4gICAgICAgIGlmIChvcmlnaW4uZXhjbHVkZUVuZCkge1xuICAgICAgICAgIG1vZGVfYnVmZmVyID0gbGV4ZW1lO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBkbyB7XG4gICAgICAgIGlmICh0b3AuY2xhc3NOYW1lKSB7XG4gICAgICAgICAgcmVzdWx0ICs9IHNwYW5FbmRUYWc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0b3Auc2tpcCAmJiAhdG9wLnN1Ykxhbmd1YWdlKSB7XG4gICAgICAgICAgcmVsZXZhbmNlICs9IHRvcC5yZWxldmFuY2U7XG4gICAgICAgIH1cbiAgICAgICAgdG9wID0gdG9wLnBhcmVudDtcbiAgICAgIH0gd2hpbGUgKHRvcCAhPT0gZW5kX21vZGUucGFyZW50KTtcbiAgICAgIGlmIChlbmRfbW9kZS5zdGFydHMpIHtcbiAgICAgICAgaWYgKGVuZF9tb2RlLmVuZFNhbWVBc0JlZ2luKSB7XG4gICAgICAgICAgZW5kX21vZGUuc3RhcnRzLmVuZFJlID0gZW5kX21vZGUuZW5kUmU7XG4gICAgICAgIH1cbiAgICAgICAgc3RhcnROZXdNb2RlKGVuZF9tb2RlLnN0YXJ0cywgJycpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG9yaWdpbi5yZXR1cm5FbmQgPyAwIDogbGV4ZW1lLmxlbmd0aDtcbiAgICB9XG5cbiAgICB2YXIgbGFzdE1hdGNoID0ge307XG4gICAgZnVuY3Rpb24gcHJvY2Vzc0xleGVtZSh0ZXh0X2JlZm9yZV9tYXRjaCwgbWF0Y2gpIHtcblxuICAgICAgdmFyIGxleGVtZSA9IG1hdGNoICYmIG1hdGNoWzBdO1xuXG4gICAgICAvLyBhZGQgbm9uLW1hdGNoZWQgdGV4dCB0byB0aGUgY3VycmVudCBtb2RlIGJ1ZmZlclxuICAgICAgbW9kZV9idWZmZXIgKz0gdGV4dF9iZWZvcmVfbWF0Y2g7XG5cbiAgICAgIGlmIChsZXhlbWUgPT0gbnVsbCkge1xuICAgICAgICBwcm9jZXNzQnVmZmVyKCk7XG4gICAgICAgIHJldHVybiAwO1xuICAgICAgfVxuXG4gICAgICAvLyB3ZSd2ZSBmb3VuZCBhIDAgd2lkdGggbWF0Y2ggYW5kIHdlJ3JlIHN0dWNrLCBzbyB3ZSBuZWVkIHRvIGFkdmFuY2VcbiAgICAgIC8vIHRoaXMgaGFwcGVucyB3aGVuIHdlIGhhdmUgYmFkbHkgYmVoYXZlZCBydWxlcyB0aGF0IGhhdmUgb3B0aW9uYWwgbWF0Y2hlcnMgdG8gdGhlIGRlZ3JlZSB0aGF0XG4gICAgICAvLyBzb21ldGltZXMgdGhleSBjYW4gZW5kIHVwIG1hdGNoaW5nIG5vdGhpbmcgYXQgYWxsXG4gICAgICAvLyBSZWY6IGh0dHBzOi8vZ2l0aHViLmNvbS9oaWdobGlnaHRqcy9oaWdobGlnaHQuanMvaXNzdWVzLzIxNDBcbiAgICAgIGlmIChsYXN0TWF0Y2gudHlwZT09XCJiZWdpblwiICYmIG1hdGNoLnR5cGU9PVwiZW5kXCIgJiYgbGFzdE1hdGNoLmluZGV4ID09IG1hdGNoLmluZGV4ICYmIGxleGVtZSA9PT0gXCJcIikge1xuICAgICAgICAvLyBzcGl0IHRoZSBcInNraXBwZWRcIiBjaGFyYWN0ZXIgdGhhdCBvdXIgcmVnZXggY2hva2VkIG9uIGJhY2sgaW50byB0aGUgb3V0cHV0IHNlcXVlbmNlXG4gICAgICAgIG1vZGVfYnVmZmVyICs9IHZhbHVlLnNsaWNlKG1hdGNoLmluZGV4LCBtYXRjaC5pbmRleCArIDEpXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuICAgICAgbGFzdE1hdGNoID0gbWF0Y2g7XG5cbiAgICAgIGlmIChtYXRjaC50eXBlPT09XCJiZWdpblwiKSB7XG4gICAgICAgIHJldHVybiBkb0JlZ2luTWF0Y2gobWF0Y2gpO1xuICAgICAgfSBlbHNlIGlmIChtYXRjaC50eXBlPT09XCJpbGxlZ2FsXCIgJiYgIWlnbm9yZV9pbGxlZ2Fscykge1xuICAgICAgICAvLyBpbGxlZ2FsIG1hdGNoLCB3ZSBkbyBub3QgY29udGludWUgcHJvY2Vzc2luZ1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0lsbGVnYWwgbGV4ZW1lIFwiJyArIGxleGVtZSArICdcIiBmb3IgbW9kZSBcIicgKyAodG9wLmNsYXNzTmFtZSB8fCAnPHVubmFtZWQ+JykgKyAnXCInKTtcbiAgICAgIH0gZWxzZSBpZiAobWF0Y2gudHlwZT09PVwiZW5kXCIpIHtcbiAgICAgICAgdmFyIHByb2Nlc3NlZCA9IGRvRW5kTWF0Y2gobWF0Y2gpO1xuICAgICAgICBpZiAocHJvY2Vzc2VkICE9IHVuZGVmaW5lZClcbiAgICAgICAgICByZXR1cm4gcHJvY2Vzc2VkO1xuICAgICAgfVxuXG4gICAgICAvKlxuICAgICAgV2h5IG1pZ2h0IGJlIGZpbmQgb3Vyc2VsdmVzIGhlcmU/ICBPbmx5IG9uZSBvY2Nhc2lvbiBub3cuICBBbiBlbmQgbWF0Y2ggdGhhdCB3YXNcbiAgICAgIHRyaWdnZXJlZCBidXQgY291bGQgbm90IGJlIGNvbXBsZXRlZC4gIFdoZW4gbWlnaHQgdGhpcyBoYXBwZW4/ICBXaGVuIGFuIGBlbmRTYW1lYXNCZWdpbmBcbiAgICAgIHJ1bGUgc2V0cyB0aGUgZW5kIHJ1bGUgdG8gYSBzcGVjaWZpYyBtYXRjaC4gIFNpbmNlIHRoZSBvdmVyYWxsIG1vZGUgdGVybWluYXRpb24gcnVsZSB0aGF0J3NcbiAgICAgIGJlaW5nIHVzZWQgdG8gc2NhbiB0aGUgdGV4dCBpc24ndCByZWNvbXBpbGVkIHRoYXQgbWVhbnMgdGhhdCBhbnkgbWF0Y2ggdGhhdCBMT09LUyBsaWtlXG4gICAgICB0aGUgZW5kIChidXQgaXMgbm90LCBiZWNhdXNlIGl0IGlzIG5vdCBhbiBleGFjdCBtYXRjaCB0byB0aGUgYmVnaW5uaW5nKSB3aWxsXG4gICAgICBlbmQgdXAgaGVyZS4gIEEgZGVmaW5pdGUgZW5kIG1hdGNoLCBidXQgd2hlbiBgZG9FbmRNYXRjaGAgdHJpZXMgdG8gXCJyZWFwcGx5XCJcbiAgICAgIHRoZSBlbmQgcnVsZSBhbmQgZmFpbHMgdG8gbWF0Y2gsIHdlIHdpbmQgdXAgaGVyZSwgYW5kIGp1c3Qgc2lsZW50bHkgaWdub3JlIHRoZSBlbmQuXG5cbiAgICAgIFRoaXMgY2F1c2VzIG5vIHJlYWwgaGFybSBvdGhlciB0aGFuIHN0b3BwaW5nIGEgZmV3IHRpbWVzIHRvbyBtYW55LlxuICAgICAgKi9cblxuICAgICAgbW9kZV9idWZmZXIgKz0gbGV4ZW1lO1xuICAgICAgcmV0dXJuIGxleGVtZS5sZW5ndGg7XG4gICAgfVxuXG4gICAgdmFyIGxhbmd1YWdlID0gZ2V0TGFuZ3VhZ2UobmFtZSk7XG4gICAgaWYgKCFsYW5ndWFnZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGxhbmd1YWdlOiBcIicgKyBuYW1lICsgJ1wiJyk7XG4gICAgfVxuXG4gICAgY29tcGlsZUxhbmd1YWdlKGxhbmd1YWdlKTtcbiAgICB2YXIgdG9wID0gY29udGludWF0aW9uIHx8IGxhbmd1YWdlO1xuICAgIHZhciBjb250aW51YXRpb25zID0ge307IC8vIGtlZXAgY29udGludWF0aW9ucyBmb3Igc3ViLWxhbmd1YWdlc1xuICAgIHZhciByZXN1bHQgPSAnJywgY3VycmVudDtcbiAgICBmb3IoY3VycmVudCA9IHRvcDsgY3VycmVudCAhPT0gbGFuZ3VhZ2U7IGN1cnJlbnQgPSBjdXJyZW50LnBhcmVudCkge1xuICAgICAgaWYgKGN1cnJlbnQuY2xhc3NOYW1lKSB7XG4gICAgICAgIHJlc3VsdCA9IGJ1aWxkU3BhbihjdXJyZW50LmNsYXNzTmFtZSwgJycsIHRydWUpICsgcmVzdWx0O1xuICAgICAgfVxuICAgIH1cbiAgICB2YXIgbW9kZV9idWZmZXIgPSAnJztcbiAgICB2YXIgcmVsZXZhbmNlID0gMDtcbiAgICB0cnkge1xuICAgICAgdmFyIG1hdGNoLCBjb3VudCwgaW5kZXggPSAwO1xuICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgdG9wLnRlcm1pbmF0b3JzLmxhc3RJbmRleCA9IGluZGV4O1xuICAgICAgICBtYXRjaCA9IHRvcC50ZXJtaW5hdG9ycy5leGVjKHZhbHVlKTtcbiAgICAgICAgaWYgKCFtYXRjaClcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY291bnQgPSBwcm9jZXNzTGV4ZW1lKHZhbHVlLnN1YnN0cmluZyhpbmRleCwgbWF0Y2guaW5kZXgpLCBtYXRjaCk7XG4gICAgICAgIGluZGV4ID0gbWF0Y2guaW5kZXggKyBjb3VudDtcbiAgICAgIH1cbiAgICAgIHByb2Nlc3NMZXhlbWUodmFsdWUuc3Vic3RyKGluZGV4KSk7XG4gICAgICBmb3IoY3VycmVudCA9IHRvcDsgY3VycmVudC5wYXJlbnQ7IGN1cnJlbnQgPSBjdXJyZW50LnBhcmVudCkgeyAvLyBjbG9zZSBkYW5nbGluZyBtb2Rlc1xuICAgICAgICBpZiAoY3VycmVudC5jbGFzc05hbWUpIHtcbiAgICAgICAgICByZXN1bHQgKz0gc3BhbkVuZFRhZztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcmVsZXZhbmNlOiByZWxldmFuY2UsXG4gICAgICAgIHZhbHVlOiByZXN1bHQsXG4gICAgICAgIGlsbGVnYWw6ZmFsc2UsXG4gICAgICAgIGxhbmd1YWdlOiBuYW1lLFxuICAgICAgICB0b3A6IHRvcFxuICAgICAgfTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZS5tZXNzYWdlICYmIGUubWVzc2FnZS5pbmRleE9mKCdJbGxlZ2FsJykgIT09IC0xKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgaWxsZWdhbDogdHJ1ZSxcbiAgICAgICAgICByZWxldmFuY2U6IDAsXG4gICAgICAgICAgdmFsdWU6IGVzY2FwZSh2YWx1ZSlcbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLypcbiAgSGlnaGxpZ2h0aW5nIHdpdGggbGFuZ3VhZ2UgZGV0ZWN0aW9uLiBBY2NlcHRzIGEgc3RyaW5nIHdpdGggdGhlIGNvZGUgdG9cbiAgaGlnaGxpZ2h0LiBSZXR1cm5zIGFuIG9iamVjdCB3aXRoIHRoZSBmb2xsb3dpbmcgcHJvcGVydGllczpcblxuICAtIGxhbmd1YWdlIChkZXRlY3RlZCBsYW5ndWFnZSlcbiAgLSByZWxldmFuY2UgKGludClcbiAgLSB2YWx1ZSAoYW4gSFRNTCBzdHJpbmcgd2l0aCBoaWdobGlnaHRpbmcgbWFya3VwKVxuICAtIHNlY29uZF9iZXN0IChvYmplY3Qgd2l0aCB0aGUgc2FtZSBzdHJ1Y3R1cmUgZm9yIHNlY29uZC1iZXN0IGhldXJpc3RpY2FsbHlcbiAgICBkZXRlY3RlZCBsYW5ndWFnZSwgbWF5IGJlIGFic2VudClcblxuICAqL1xuICBmdW5jdGlvbiBoaWdobGlnaHRBdXRvKHRleHQsIGxhbmd1YWdlU3Vic2V0KSB7XG4gICAgbGFuZ3VhZ2VTdWJzZXQgPSBsYW5ndWFnZVN1YnNldCB8fCBvcHRpb25zLmxhbmd1YWdlcyB8fCBvYmplY3RLZXlzKGxhbmd1YWdlcyk7XG4gICAgdmFyIHJlc3VsdCA9IHtcbiAgICAgIHJlbGV2YW5jZTogMCxcbiAgICAgIHZhbHVlOiBlc2NhcGUodGV4dClcbiAgICB9O1xuICAgIHZhciBzZWNvbmRfYmVzdCA9IHJlc3VsdDtcbiAgICBsYW5ndWFnZVN1YnNldC5maWx0ZXIoZ2V0TGFuZ3VhZ2UpLmZpbHRlcihhdXRvRGV0ZWN0aW9uKS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIHZhciBjdXJyZW50ID0gaGlnaGxpZ2h0KG5hbWUsIHRleHQsIGZhbHNlKTtcbiAgICAgIGN1cnJlbnQubGFuZ3VhZ2UgPSBuYW1lO1xuICAgICAgaWYgKGN1cnJlbnQucmVsZXZhbmNlID4gc2Vjb25kX2Jlc3QucmVsZXZhbmNlKSB7XG4gICAgICAgIHNlY29uZF9iZXN0ID0gY3VycmVudDtcbiAgICAgIH1cbiAgICAgIGlmIChjdXJyZW50LnJlbGV2YW5jZSA+IHJlc3VsdC5yZWxldmFuY2UpIHtcbiAgICAgICAgc2Vjb25kX2Jlc3QgPSByZXN1bHQ7XG4gICAgICAgIHJlc3VsdCA9IGN1cnJlbnQ7XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKHNlY29uZF9iZXN0Lmxhbmd1YWdlKSB7XG4gICAgICByZXN1bHQuc2Vjb25kX2Jlc3QgPSBzZWNvbmRfYmVzdDtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qXG4gIFBvc3QtcHJvY2Vzc2luZyBvZiB0aGUgaGlnaGxpZ2h0ZWQgbWFya3VwOlxuXG4gIC0gcmVwbGFjZSBUQUJzIHdpdGggc29tZXRoaW5nIG1vcmUgdXNlZnVsXG4gIC0gcmVwbGFjZSByZWFsIGxpbmUtYnJlYWtzIHdpdGggJzxicj4nIGZvciBub24tcHJlIGNvbnRhaW5lcnNcblxuICAqL1xuICBmdW5jdGlvbiBmaXhNYXJrdXAodmFsdWUpIHtcbiAgICByZXR1cm4gIShvcHRpb25zLnRhYlJlcGxhY2UgfHwgb3B0aW9ucy51c2VCUilcbiAgICAgID8gdmFsdWVcbiAgICAgIDogdmFsdWUucmVwbGFjZShmaXhNYXJrdXBSZSwgZnVuY3Rpb24obWF0Y2gsIHAxKSB7XG4gICAgICAgICAgaWYgKG9wdGlvbnMudXNlQlIgJiYgbWF0Y2ggPT09ICdcXG4nKSB7XG4gICAgICAgICAgICByZXR1cm4gJzxicj4nO1xuICAgICAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy50YWJSZXBsYWNlKSB7XG4gICAgICAgICAgICByZXR1cm4gcDEucmVwbGFjZSgvXFx0L2csIG9wdGlvbnMudGFiUmVwbGFjZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiAnJztcbiAgICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gYnVpbGRDbGFzc05hbWUocHJldkNsYXNzTmFtZSwgY3VycmVudExhbmcsIHJlc3VsdExhbmcpIHtcbiAgICB2YXIgbGFuZ3VhZ2UgPSBjdXJyZW50TGFuZyA/IGFsaWFzZXNbY3VycmVudExhbmddIDogcmVzdWx0TGFuZyxcbiAgICAgICAgcmVzdWx0ICAgPSBbcHJldkNsYXNzTmFtZS50cmltKCldO1xuXG4gICAgaWYgKCFwcmV2Q2xhc3NOYW1lLm1hdGNoKC9cXGJobGpzXFxiLykpIHtcbiAgICAgIHJlc3VsdC5wdXNoKCdobGpzJyk7XG4gICAgfVxuXG4gICAgaWYgKHByZXZDbGFzc05hbWUuaW5kZXhPZihsYW5ndWFnZSkgPT09IC0xKSB7XG4gICAgICByZXN1bHQucHVzaChsYW5ndWFnZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdC5qb2luKCcgJykudHJpbSgpO1xuICB9XG5cbiAgLypcbiAgQXBwbGllcyBoaWdobGlnaHRpbmcgdG8gYSBET00gbm9kZSBjb250YWluaW5nIGNvZGUuIEFjY2VwdHMgYSBET00gbm9kZSBhbmRcbiAgdHdvIG9wdGlvbmFsIHBhcmFtZXRlcnMgZm9yIGZpeE1hcmt1cC5cbiAgKi9cbiAgZnVuY3Rpb24gaGlnaGxpZ2h0QmxvY2soYmxvY2spIHtcbiAgICB2YXIgbm9kZSwgb3JpZ2luYWxTdHJlYW0sIHJlc3VsdCwgcmVzdWx0Tm9kZSwgdGV4dDtcbiAgICB2YXIgbGFuZ3VhZ2UgPSBibG9ja0xhbmd1YWdlKGJsb2NrKTtcblxuICAgIGlmIChpc05vdEhpZ2hsaWdodGVkKGxhbmd1YWdlKSlcbiAgICAgICAgcmV0dXJuO1xuXG4gICAgaWYgKG9wdGlvbnMudXNlQlIpIHtcbiAgICAgIG5vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzE5OTkveGh0bWwnLCAnZGl2Jyk7XG4gICAgICBub2RlLmlubmVySFRNTCA9IGJsb2NrLmlubmVySFRNTC5yZXBsYWNlKC9cXG4vZywgJycpLnJlcGxhY2UoLzxiclsgXFwvXSo+L2csICdcXG4nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbm9kZSA9IGJsb2NrO1xuICAgIH1cbiAgICB0ZXh0ID0gbm9kZS50ZXh0Q29udGVudDtcbiAgICByZXN1bHQgPSBsYW5ndWFnZSA/IGhpZ2hsaWdodChsYW5ndWFnZSwgdGV4dCwgdHJ1ZSkgOiBoaWdobGlnaHRBdXRvKHRleHQpO1xuXG4gICAgb3JpZ2luYWxTdHJlYW0gPSBub2RlU3RyZWFtKG5vZGUpO1xuICAgIGlmIChvcmlnaW5hbFN0cmVhbS5sZW5ndGgpIHtcbiAgICAgIHJlc3VsdE5vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzE5OTkveGh0bWwnLCAnZGl2Jyk7XG4gICAgICByZXN1bHROb2RlLmlubmVySFRNTCA9IHJlc3VsdC52YWx1ZTtcbiAgICAgIHJlc3VsdC52YWx1ZSA9IG1lcmdlU3RyZWFtcyhvcmlnaW5hbFN0cmVhbSwgbm9kZVN0cmVhbShyZXN1bHROb2RlKSwgdGV4dCk7XG4gICAgfVxuICAgIHJlc3VsdC52YWx1ZSA9IGZpeE1hcmt1cChyZXN1bHQudmFsdWUpO1xuXG4gICAgYmxvY2suaW5uZXJIVE1MID0gcmVzdWx0LnZhbHVlO1xuICAgIGJsb2NrLmNsYXNzTmFtZSA9IGJ1aWxkQ2xhc3NOYW1lKGJsb2NrLmNsYXNzTmFtZSwgbGFuZ3VhZ2UsIHJlc3VsdC5sYW5ndWFnZSk7XG4gICAgYmxvY2sucmVzdWx0ID0ge1xuICAgICAgbGFuZ3VhZ2U6IHJlc3VsdC5sYW5ndWFnZSxcbiAgICAgIHJlOiByZXN1bHQucmVsZXZhbmNlXG4gICAgfTtcbiAgICBpZiAocmVzdWx0LnNlY29uZF9iZXN0KSB7XG4gICAgICBibG9jay5zZWNvbmRfYmVzdCA9IHtcbiAgICAgICAgbGFuZ3VhZ2U6IHJlc3VsdC5zZWNvbmRfYmVzdC5sYW5ndWFnZSxcbiAgICAgICAgcmU6IHJlc3VsdC5zZWNvbmRfYmVzdC5yZWxldmFuY2VcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgLypcbiAgVXBkYXRlcyBoaWdobGlnaHQuanMgZ2xvYmFsIG9wdGlvbnMgd2l0aCB2YWx1ZXMgcGFzc2VkIGluIHRoZSBmb3JtIG9mIGFuIG9iamVjdC5cbiAgKi9cbiAgZnVuY3Rpb24gY29uZmlndXJlKHVzZXJfb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBpbmhlcml0KG9wdGlvbnMsIHVzZXJfb3B0aW9ucyk7XG4gIH1cblxuICAvKlxuICBBcHBsaWVzIGhpZ2hsaWdodGluZyB0byBhbGwgPHByZT48Y29kZT4uLjwvY29kZT48L3ByZT4gYmxvY2tzIG9uIGEgcGFnZS5cbiAgKi9cbiAgZnVuY3Rpb24gaW5pdEhpZ2hsaWdodGluZygpIHtcbiAgICBpZiAoaW5pdEhpZ2hsaWdodGluZy5jYWxsZWQpXG4gICAgICByZXR1cm47XG4gICAgaW5pdEhpZ2hsaWdodGluZy5jYWxsZWQgPSB0cnVlO1xuXG4gICAgdmFyIGJsb2NrcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ3ByZSBjb2RlJyk7XG4gICAgQXJyYXlQcm90by5mb3JFYWNoLmNhbGwoYmxvY2tzLCBoaWdobGlnaHRCbG9jayk7XG4gIH1cblxuICAvKlxuICBBdHRhY2hlcyBoaWdobGlnaHRpbmcgdG8gdGhlIHBhZ2UgbG9hZCBldmVudC5cbiAgKi9cbiAgZnVuY3Rpb24gaW5pdEhpZ2hsaWdodGluZ09uTG9hZCgpIHtcbiAgICBhZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgaW5pdEhpZ2hsaWdodGluZywgZmFsc2UpO1xuICAgIGFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCBpbml0SGlnaGxpZ2h0aW5nLCBmYWxzZSk7XG4gIH1cblxuICBmdW5jdGlvbiByZWdpc3Rlckxhbmd1YWdlKG5hbWUsIGxhbmd1YWdlKSB7XG4gICAgdmFyIGxhbmcgPSBsYW5ndWFnZXNbbmFtZV0gPSBsYW5ndWFnZShobGpzKTtcbiAgICByZXN0b3JlTGFuZ3VhZ2VBcGkobGFuZyk7XG4gICAgbGFuZy5yYXdEZWZpbml0aW9uID0gbGFuZ3VhZ2UuYmluZChudWxsLGhsanMpO1xuXG4gICAgaWYgKGxhbmcuYWxpYXNlcykge1xuICAgICAgbGFuZy5hbGlhc2VzLmZvckVhY2goZnVuY3Rpb24oYWxpYXMpIHthbGlhc2VzW2FsaWFzXSA9IG5hbWU7fSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gbGlzdExhbmd1YWdlcygpIHtcbiAgICByZXR1cm4gb2JqZWN0S2V5cyhsYW5ndWFnZXMpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0TGFuZ3VhZ2UobmFtZSkge1xuICAgIG5hbWUgPSAobmFtZSB8fCAnJykudG9Mb3dlckNhc2UoKTtcbiAgICByZXR1cm4gbGFuZ3VhZ2VzW25hbWVdIHx8IGxhbmd1YWdlc1thbGlhc2VzW25hbWVdXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGF1dG9EZXRlY3Rpb24obmFtZSkge1xuICAgIHZhciBsYW5nID0gZ2V0TGFuZ3VhZ2UobmFtZSk7XG4gICAgcmV0dXJuIGxhbmcgJiYgIWxhbmcuZGlzYWJsZUF1dG9kZXRlY3Q7XG4gIH1cblxuICAvKiBJbnRlcmZhY2UgZGVmaW5pdGlvbiAqL1xuXG4gIGhsanMuaGlnaGxpZ2h0ID0gaGlnaGxpZ2h0O1xuICBobGpzLmhpZ2hsaWdodEF1dG8gPSBoaWdobGlnaHRBdXRvO1xuICBobGpzLmZpeE1hcmt1cCA9IGZpeE1hcmt1cDtcbiAgaGxqcy5oaWdobGlnaHRCbG9jayA9IGhpZ2hsaWdodEJsb2NrO1xuICBobGpzLmNvbmZpZ3VyZSA9IGNvbmZpZ3VyZTtcbiAgaGxqcy5pbml0SGlnaGxpZ2h0aW5nID0gaW5pdEhpZ2hsaWdodGluZztcbiAgaGxqcy5pbml0SGlnaGxpZ2h0aW5nT25Mb2FkID0gaW5pdEhpZ2hsaWdodGluZ09uTG9hZDtcbiAgaGxqcy5yZWdpc3Rlckxhbmd1YWdlID0gcmVnaXN0ZXJMYW5ndWFnZTtcbiAgaGxqcy5saXN0TGFuZ3VhZ2VzID0gbGlzdExhbmd1YWdlcztcbiAgaGxqcy5nZXRMYW5ndWFnZSA9IGdldExhbmd1YWdlO1xuICBobGpzLmF1dG9EZXRlY3Rpb24gPSBhdXRvRGV0ZWN0aW9uO1xuICBobGpzLmluaGVyaXQgPSBpbmhlcml0O1xuXG4gIC8vIENvbW1vbiByZWdleHBzXG4gIGhsanMuSURFTlRfUkUgPSAnW2EtekEtWl1cXFxcdyonO1xuICBobGpzLlVOREVSU0NPUkVfSURFTlRfUkUgPSAnW2EtekEtWl9dXFxcXHcqJztcbiAgaGxqcy5OVU1CRVJfUkUgPSAnXFxcXGJcXFxcZCsoXFxcXC5cXFxcZCspPyc7XG4gIGhsanMuQ19OVU1CRVJfUkUgPSAnKC0/KShcXFxcYjBbeFhdW2EtZkEtRjAtOV0rfChcXFxcYlxcXFxkKyhcXFxcLlxcXFxkKik/fFxcXFwuXFxcXGQrKShbZUVdWy0rXT9cXFxcZCspPyknOyAvLyAweC4uLiwgMC4uLiwgZGVjaW1hbCwgZmxvYXRcbiAgaGxqcy5CSU5BUllfTlVNQkVSX1JFID0gJ1xcXFxiKDBiWzAxXSspJzsgLy8gMGIuLi5cbiAgaGxqcy5SRV9TVEFSVEVSU19SRSA9ICchfCE9fCE9PXwlfCU9fCZ8JiZ8Jj18XFxcXCp8XFxcXCo9fFxcXFwrfFxcXFwrPXwsfC18LT18Lz18L3w6fDt8PDx8PDw9fDw9fDx8PT09fD09fD18Pj4+PXw+Pj18Pj18Pj4+fD4+fD58XFxcXD98XFxcXFt8XFxcXHt8XFxcXCh8XFxcXF58XFxcXF49fFxcXFx8fFxcXFx8PXxcXFxcfFxcXFx8fH4nO1xuXG4gIC8vIENvbW1vbiBtb2Rlc1xuICBobGpzLkJBQ0tTTEFTSF9FU0NBUEUgPSB7XG4gICAgYmVnaW46ICdcXFxcXFxcXFtcXFxcc1xcXFxTXScsIHJlbGV2YW5jZTogMFxuICB9O1xuICBobGpzLkFQT1NfU1RSSU5HX01PREUgPSB7XG4gICAgY2xhc3NOYW1lOiAnc3RyaW5nJyxcbiAgICBiZWdpbjogJ1xcJycsIGVuZDogJ1xcJycsXG4gICAgaWxsZWdhbDogJ1xcXFxuJyxcbiAgICBjb250YWluczogW2hsanMuQkFDS1NMQVNIX0VTQ0FQRV1cbiAgfTtcbiAgaGxqcy5RVU9URV9TVFJJTkdfTU9ERSA9IHtcbiAgICBjbGFzc05hbWU6ICdzdHJpbmcnLFxuICAgIGJlZ2luOiAnXCInLCBlbmQ6ICdcIicsXG4gICAgaWxsZWdhbDogJ1xcXFxuJyxcbiAgICBjb250YWluczogW2hsanMuQkFDS1NMQVNIX0VTQ0FQRV1cbiAgfTtcbiAgaGxqcy5QSFJBU0FMX1dPUkRTX01PREUgPSB7XG4gICAgYmVnaW46IC9cXGIoYXxhbnx0aGV8YXJlfEknbXxpc24ndHxkb24ndHxkb2Vzbid0fHdvbid0fGJ1dHxqdXN0fHNob3VsZHxwcmV0dHl8c2ltcGx5fGVub3VnaHxnb25uYXxnb2luZ3x3dGZ8c298c3VjaHx3aWxsfHlvdXx5b3VyfHRoZXl8bGlrZXxtb3JlKVxcYi9cbiAgfTtcbiAgaGxqcy5DT01NRU5UID0gZnVuY3Rpb24gKGJlZ2luLCBlbmQsIGluaGVyaXRzKSB7XG4gICAgdmFyIG1vZGUgPSBobGpzLmluaGVyaXQoXG4gICAgICB7XG4gICAgICAgIGNsYXNzTmFtZTogJ2NvbW1lbnQnLFxuICAgICAgICBiZWdpbjogYmVnaW4sIGVuZDogZW5kLFxuICAgICAgICBjb250YWluczogW11cbiAgICAgIH0sXG4gICAgICBpbmhlcml0cyB8fCB7fVxuICAgICk7XG4gICAgbW9kZS5jb250YWlucy5wdXNoKGhsanMuUEhSQVNBTF9XT1JEU19NT0RFKTtcbiAgICBtb2RlLmNvbnRhaW5zLnB1c2goe1xuICAgICAgY2xhc3NOYW1lOiAnZG9jdGFnJyxcbiAgICAgIGJlZ2luOiAnKD86VE9ET3xGSVhNRXxOT1RFfEJVR3xYWFgpOicsXG4gICAgICByZWxldmFuY2U6IDBcbiAgICB9KTtcbiAgICByZXR1cm4gbW9kZTtcbiAgfTtcbiAgaGxqcy5DX0xJTkVfQ09NTUVOVF9NT0RFID0gaGxqcy5DT01NRU5UKCcvLycsICckJyk7XG4gIGhsanMuQ19CTE9DS19DT01NRU5UX01PREUgPSBobGpzLkNPTU1FTlQoJy9cXFxcKicsICdcXFxcKi8nKTtcbiAgaGxqcy5IQVNIX0NPTU1FTlRfTU9ERSA9IGhsanMuQ09NTUVOVCgnIycsICckJyk7XG4gIGhsanMuTlVNQkVSX01PREUgPSB7XG4gICAgY2xhc3NOYW1lOiAnbnVtYmVyJyxcbiAgICBiZWdpbjogaGxqcy5OVU1CRVJfUkUsXG4gICAgcmVsZXZhbmNlOiAwXG4gIH07XG4gIGhsanMuQ19OVU1CRVJfTU9ERSA9IHtcbiAgICBjbGFzc05hbWU6ICdudW1iZXInLFxuICAgIGJlZ2luOiBobGpzLkNfTlVNQkVSX1JFLFxuICAgIHJlbGV2YW5jZTogMFxuICB9O1xuICBobGpzLkJJTkFSWV9OVU1CRVJfTU9ERSA9IHtcbiAgICBjbGFzc05hbWU6ICdudW1iZXInLFxuICAgIGJlZ2luOiBobGpzLkJJTkFSWV9OVU1CRVJfUkUsXG4gICAgcmVsZXZhbmNlOiAwXG4gIH07XG4gIGhsanMuQ1NTX05VTUJFUl9NT0RFID0ge1xuICAgIGNsYXNzTmFtZTogJ251bWJlcicsXG4gICAgYmVnaW46IGhsanMuTlVNQkVSX1JFICsgJygnICtcbiAgICAgICclfGVtfGV4fGNofHJlbScgICtcbiAgICAgICd8dnd8dmh8dm1pbnx2bWF4JyArXG4gICAgICAnfGNtfG1tfGlufHB0fHBjfHB4JyArXG4gICAgICAnfGRlZ3xncmFkfHJhZHx0dXJuJyArXG4gICAgICAnfHN8bXMnICtcbiAgICAgICd8SHp8a0h6JyArXG4gICAgICAnfGRwaXxkcGNtfGRwcHgnICtcbiAgICAgICcpPycsXG4gICAgcmVsZXZhbmNlOiAwXG4gIH07XG4gIGhsanMuUkVHRVhQX01PREUgPSB7XG4gICAgY2xhc3NOYW1lOiAncmVnZXhwJyxcbiAgICBiZWdpbjogL1xcLy8sIGVuZDogL1xcL1tnaW11eV0qLyxcbiAgICBpbGxlZ2FsOiAvXFxuLyxcbiAgICBjb250YWluczogW1xuICAgICAgaGxqcy5CQUNLU0xBU0hfRVNDQVBFLFxuICAgICAge1xuICAgICAgICBiZWdpbjogL1xcWy8sIGVuZDogL1xcXS8sXG4gICAgICAgIHJlbGV2YW5jZTogMCxcbiAgICAgICAgY29udGFpbnM6IFtobGpzLkJBQ0tTTEFTSF9FU0NBUEVdXG4gICAgICB9XG4gICAgXVxuICB9O1xuICBobGpzLlRJVExFX01PREUgPSB7XG4gICAgY2xhc3NOYW1lOiAndGl0bGUnLFxuICAgIGJlZ2luOiBobGpzLklERU5UX1JFLFxuICAgIHJlbGV2YW5jZTogMFxuICB9O1xuICBobGpzLlVOREVSU0NPUkVfVElUTEVfTU9ERSA9IHtcbiAgICBjbGFzc05hbWU6ICd0aXRsZScsXG4gICAgYmVnaW46IGhsanMuVU5ERVJTQ09SRV9JREVOVF9SRSxcbiAgICByZWxldmFuY2U6IDBcbiAgfTtcbiAgaGxqcy5NRVRIT0RfR1VBUkQgPSB7XG4gICAgLy8gZXhjbHVkZXMgbWV0aG9kIG5hbWVzIGZyb20ga2V5d29yZCBwcm9jZXNzaW5nXG4gICAgYmVnaW46ICdcXFxcLlxcXFxzKicgKyBobGpzLlVOREVSU0NPUkVfSURFTlRfUkUsXG4gICAgcmVsZXZhbmNlOiAwXG4gIH07XG5cbiAgcmV0dXJuIGhsanM7XG59KSk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGhsanMpIHtcbiAgdmFyIElERU5UX1JFID0gJ1tBLVphLXokX11bMC05QS1aYS16JF9dKic7XG4gIHZhciBLRVlXT1JEUyA9IHtcbiAgICBrZXl3b3JkOlxuICAgICAgJ2luIG9mIGlmIGZvciB3aGlsZSBmaW5hbGx5IHZhciBuZXcgZnVuY3Rpb24gZG8gcmV0dXJuIHZvaWQgZWxzZSBicmVhayBjYXRjaCAnICtcbiAgICAgICdpbnN0YW5jZW9mIHdpdGggdGhyb3cgY2FzZSBkZWZhdWx0IHRyeSB0aGlzIHN3aXRjaCBjb250aW51ZSB0eXBlb2YgZGVsZXRlICcgK1xuICAgICAgJ2xldCB5aWVsZCBjb25zdCBleHBvcnQgc3VwZXIgZGVidWdnZXIgYXMgYXN5bmMgYXdhaXQgc3RhdGljICcgK1xuICAgICAgLy8gRUNNQVNjcmlwdCA2IG1vZHVsZXMgaW1wb3J0XG4gICAgICAnaW1wb3J0IGZyb20gYXMnXG4gICAgLFxuICAgIGxpdGVyYWw6XG4gICAgICAndHJ1ZSBmYWxzZSBudWxsIHVuZGVmaW5lZCBOYU4gSW5maW5pdHknLFxuICAgIGJ1aWx0X2luOlxuICAgICAgJ2V2YWwgaXNGaW5pdGUgaXNOYU4gcGFyc2VGbG9hdCBwYXJzZUludCBkZWNvZGVVUkkgZGVjb2RlVVJJQ29tcG9uZW50ICcgK1xuICAgICAgJ2VuY29kZVVSSSBlbmNvZGVVUklDb21wb25lbnQgZXNjYXBlIHVuZXNjYXBlIE9iamVjdCBGdW5jdGlvbiBCb29sZWFuIEVycm9yICcgK1xuICAgICAgJ0V2YWxFcnJvciBJbnRlcm5hbEVycm9yIFJhbmdlRXJyb3IgUmVmZXJlbmNlRXJyb3IgU3RvcEl0ZXJhdGlvbiBTeW50YXhFcnJvciAnICtcbiAgICAgICdUeXBlRXJyb3IgVVJJRXJyb3IgTnVtYmVyIE1hdGggRGF0ZSBTdHJpbmcgUmVnRXhwIEFycmF5IEZsb2F0MzJBcnJheSAnICtcbiAgICAgICdGbG9hdDY0QXJyYXkgSW50MTZBcnJheSBJbnQzMkFycmF5IEludDhBcnJheSBVaW50MTZBcnJheSBVaW50MzJBcnJheSAnICtcbiAgICAgICdVaW50OEFycmF5IFVpbnQ4Q2xhbXBlZEFycmF5IEFycmF5QnVmZmVyIERhdGFWaWV3IEpTT04gSW50bCBhcmd1bWVudHMgcmVxdWlyZSAnICtcbiAgICAgICdtb2R1bGUgY29uc29sZSB3aW5kb3cgZG9jdW1lbnQgU3ltYm9sIFNldCBNYXAgV2Vha1NldCBXZWFrTWFwIFByb3h5IFJlZmxlY3QgJyArXG4gICAgICAnUHJvbWlzZSdcbiAgfTtcbiAgdmFyIE5VTUJFUiA9IHtcbiAgICBjbGFzc05hbWU6ICdudW1iZXInLFxuICAgIHZhcmlhbnRzOiBbXG4gICAgICB7IGJlZ2luOiAnXFxcXGIoMFtiQl1bMDFdKyluPycgfSxcbiAgICAgIHsgYmVnaW46ICdcXFxcYigwW29PXVswLTddKyluPycgfSxcbiAgICAgIHsgYmVnaW46IGhsanMuQ19OVU1CRVJfUkUgKyAnbj8nIH1cbiAgICBdLFxuICAgIHJlbGV2YW5jZTogMFxuICB9O1xuICB2YXIgU1VCU1QgPSB7XG4gICAgY2xhc3NOYW1lOiAnc3Vic3QnLFxuICAgIGJlZ2luOiAnXFxcXCRcXFxceycsIGVuZDogJ1xcXFx9JyxcbiAgICBrZXl3b3JkczogS0VZV09SRFMsXG4gICAgY29udGFpbnM6IFtdICAvLyBkZWZpbmVkIGxhdGVyXG4gIH07XG4gIHZhciBIVE1MX1RFTVBMQVRFID0ge1xuICAgIGJlZ2luOiAnaHRtbGAnLCBlbmQ6ICcnLFxuICAgIHN0YXJ0czoge1xuICAgICAgZW5kOiAnYCcsIHJldHVybkVuZDogZmFsc2UsXG4gICAgICBjb250YWluczogW1xuICAgICAgICBobGpzLkJBQ0tTTEFTSF9FU0NBUEUsXG4gICAgICAgIFNVQlNUXG4gICAgICBdLFxuICAgICAgc3ViTGFuZ3VhZ2U6ICd4bWwnLFxuICAgIH1cbiAgfTtcbiAgdmFyIENTU19URU1QTEFURSA9IHtcbiAgICBiZWdpbjogJ2Nzc2AnLCBlbmQ6ICcnLFxuICAgIHN0YXJ0czoge1xuICAgICAgZW5kOiAnYCcsIHJldHVybkVuZDogZmFsc2UsXG4gICAgICBjb250YWluczogW1xuICAgICAgICBobGpzLkJBQ0tTTEFTSF9FU0NBUEUsXG4gICAgICAgIFNVQlNUXG4gICAgICBdLFxuICAgICAgc3ViTGFuZ3VhZ2U6ICdjc3MnLFxuICAgIH1cbiAgfTtcbiAgdmFyIFRFTVBMQVRFX1NUUklORyA9IHtcbiAgICBjbGFzc05hbWU6ICdzdHJpbmcnLFxuICAgIGJlZ2luOiAnYCcsIGVuZDogJ2AnLFxuICAgIGNvbnRhaW5zOiBbXG4gICAgICBobGpzLkJBQ0tTTEFTSF9FU0NBUEUsXG4gICAgICBTVUJTVFxuICAgIF1cbiAgfTtcbiAgU1VCU1QuY29udGFpbnMgPSBbXG4gICAgaGxqcy5BUE9TX1NUUklOR19NT0RFLFxuICAgIGhsanMuUVVPVEVfU1RSSU5HX01PREUsXG4gICAgSFRNTF9URU1QTEFURSxcbiAgICBDU1NfVEVNUExBVEUsXG4gICAgVEVNUExBVEVfU1RSSU5HLFxuICAgIE5VTUJFUixcbiAgICBobGpzLlJFR0VYUF9NT0RFXG4gIF07XG4gIHZhciBQQVJBTVNfQ09OVEFJTlMgPSBTVUJTVC5jb250YWlucy5jb25jYXQoW1xuICAgIGhsanMuQ19CTE9DS19DT01NRU5UX01PREUsXG4gICAgaGxqcy5DX0xJTkVfQ09NTUVOVF9NT0RFXG4gIF0pO1xuXG4gIHJldHVybiB7XG4gICAgYWxpYXNlczogWydqcycsICdqc3gnXSxcbiAgICBrZXl3b3JkczogS0VZV09SRFMsXG4gICAgY29udGFpbnM6IFtcbiAgICAgIHtcbiAgICAgICAgY2xhc3NOYW1lOiAnbWV0YScsXG4gICAgICAgIHJlbGV2YW5jZTogMTAsXG4gICAgICAgIGJlZ2luOiAvXlxccypbJ1wiXXVzZSAoc3RyaWN0fGFzbSlbJ1wiXS9cbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGNsYXNzTmFtZTogJ21ldGEnLFxuICAgICAgICBiZWdpbjogL14jIS8sIGVuZDogLyQvXG4gICAgICB9LFxuICAgICAgaGxqcy5BUE9TX1NUUklOR19NT0RFLFxuICAgICAgaGxqcy5RVU9URV9TVFJJTkdfTU9ERSxcbiAgICAgIEhUTUxfVEVNUExBVEUsXG4gICAgICBDU1NfVEVNUExBVEUsXG4gICAgICBURU1QTEFURV9TVFJJTkcsXG4gICAgICBobGpzLkNfTElORV9DT01NRU5UX01PREUsXG4gICAgICBobGpzLkNfQkxPQ0tfQ09NTUVOVF9NT0RFLFxuICAgICAgTlVNQkVSLFxuICAgICAgeyAvLyBvYmplY3QgYXR0ciBjb250YWluZXJcbiAgICAgICAgYmVnaW46IC9beyxcXG5dXFxzKi8sIHJlbGV2YW5jZTogMCxcbiAgICAgICAgY29udGFpbnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBiZWdpbjogSURFTlRfUkUgKyAnXFxcXHMqOicsIHJldHVybkJlZ2luOiB0cnVlLFxuICAgICAgICAgICAgcmVsZXZhbmNlOiAwLFxuICAgICAgICAgICAgY29udGFpbnM6IFt7Y2xhc3NOYW1lOiAnYXR0cicsIGJlZ2luOiBJREVOVF9SRSwgcmVsZXZhbmNlOiAwfV1cbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH0sXG4gICAgICB7IC8vIFwidmFsdWVcIiBjb250YWluZXJcbiAgICAgICAgYmVnaW46ICcoJyArIGhsanMuUkVfU1RBUlRFUlNfUkUgKyAnfFxcXFxiKGNhc2V8cmV0dXJufHRocm93KVxcXFxiKVxcXFxzKicsXG4gICAgICAgIGtleXdvcmRzOiAncmV0dXJuIHRocm93IGNhc2UnLFxuICAgICAgICBjb250YWluczogW1xuICAgICAgICAgIGhsanMuQ19MSU5FX0NPTU1FTlRfTU9ERSxcbiAgICAgICAgICBobGpzLkNfQkxPQ0tfQ09NTUVOVF9NT0RFLFxuICAgICAgICAgIGhsanMuUkVHRVhQX01PREUsXG4gICAgICAgICAge1xuICAgICAgICAgICAgY2xhc3NOYW1lOiAnZnVuY3Rpb24nLFxuICAgICAgICAgICAgYmVnaW46ICcoXFxcXCguKj9cXFxcKXwnICsgSURFTlRfUkUgKyAnKVxcXFxzKj0+JywgcmV0dXJuQmVnaW46IHRydWUsXG4gICAgICAgICAgICBlbmQ6ICdcXFxccyo9PicsXG4gICAgICAgICAgICBjb250YWluczogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lOiAncGFyYW1zJyxcbiAgICAgICAgICAgICAgICB2YXJpYW50czogW1xuICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBiZWdpbjogSURFTlRfUkVcbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGJlZ2luOiAvXFwoXFxzKlxcKS8sXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBiZWdpbjogL1xcKC8sIGVuZDogL1xcKS8sXG4gICAgICAgICAgICAgICAgICAgIGV4Y2x1ZGVCZWdpbjogdHJ1ZSwgZXhjbHVkZUVuZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAga2V5d29yZHM6IEtFWVdPUkRTLFxuICAgICAgICAgICAgICAgICAgICBjb250YWluczogUEFSQU1TX0NPTlRBSU5TXG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBjbGFzc05hbWU6ICcnLFxuICAgICAgICAgICAgYmVnaW46IC9cXHMvLFxuICAgICAgICAgICAgZW5kOiAvXFxzKi8sXG4gICAgICAgICAgICBza2lwOiB0cnVlLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgeyAvLyBFNFggLyBKU1hcbiAgICAgICAgICAgIGJlZ2luOiAvPC8sIGVuZDogLyhcXC9bQS1aYS16MC05XFxcXC5fOi1dK3xbQS1aYS16MC05XFxcXC5fOi1dK1xcLyk+LyxcbiAgICAgICAgICAgIHN1Ykxhbmd1YWdlOiAneG1sJyxcbiAgICAgICAgICAgIGNvbnRhaW5zOiBbXG4gICAgICAgICAgICAgIHsgYmVnaW46IC88W0EtWmEtejAtOVxcXFwuXzotXStcXHMqXFwvPi8sIHNraXA6IHRydWUgfSxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGJlZ2luOiAvPFtBLVphLXowLTlcXFxcLl86LV0rLywgZW5kOiAvKFxcL1tBLVphLXowLTlcXFxcLl86LV0rfFtBLVphLXowLTlcXFxcLl86LV0rXFwvKT4vLCBza2lwOiB0cnVlLFxuICAgICAgICAgICAgICAgIGNvbnRhaW5zOiBbXG4gICAgICAgICAgICAgICAgICB7IGJlZ2luOiAvPFtBLVphLXowLTlcXFxcLl86LV0rXFxzKlxcLz4vLCBza2lwOiB0cnVlIH0sXG4gICAgICAgICAgICAgICAgICAnc2VsZidcbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgIF0sXG4gICAgICAgIHJlbGV2YW5jZTogMFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgY2xhc3NOYW1lOiAnZnVuY3Rpb24nLFxuICAgICAgICBiZWdpbktleXdvcmRzOiAnZnVuY3Rpb24nLCBlbmQ6IC9cXHsvLCBleGNsdWRlRW5kOiB0cnVlLFxuICAgICAgICBjb250YWluczogW1xuICAgICAgICAgIGhsanMuaW5oZXJpdChobGpzLlRJVExFX01PREUsIHtiZWdpbjogSURFTlRfUkV9KSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBjbGFzc05hbWU6ICdwYXJhbXMnLFxuICAgICAgICAgICAgYmVnaW46IC9cXCgvLCBlbmQ6IC9cXCkvLFxuICAgICAgICAgICAgZXhjbHVkZUJlZ2luOiB0cnVlLFxuICAgICAgICAgICAgZXhjbHVkZUVuZDogdHJ1ZSxcbiAgICAgICAgICAgIGNvbnRhaW5zOiBQQVJBTVNfQ09OVEFJTlNcbiAgICAgICAgICB9XG4gICAgICAgIF0sXG4gICAgICAgIGlsbGVnYWw6IC9cXFt8JS9cbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGJlZ2luOiAvXFwkWyguXS8gLy8gcmVsZXZhbmNlIGJvb3N0ZXIgZm9yIGEgcGF0dGVybiBjb21tb24gdG8gSlMgbGliczogYCQoc29tZXRoaW5nKWAgYW5kIGAkLnNvbWV0aGluZ2BcbiAgICAgIH0sXG4gICAgICBobGpzLk1FVEhPRF9HVUFSRCxcbiAgICAgIHsgLy8gRVM2IGNsYXNzXG4gICAgICAgIGNsYXNzTmFtZTogJ2NsYXNzJyxcbiAgICAgICAgYmVnaW5LZXl3b3JkczogJ2NsYXNzJywgZW5kOiAvW3s7PV0vLCBleGNsdWRlRW5kOiB0cnVlLFxuICAgICAgICBpbGxlZ2FsOiAvWzpcIlxcW1xcXV0vLFxuICAgICAgICBjb250YWluczogW1xuICAgICAgICAgIHtiZWdpbktleXdvcmRzOiAnZXh0ZW5kcyd9LFxuICAgICAgICAgIGhsanMuVU5ERVJTQ09SRV9USVRMRV9NT0RFXG4gICAgICAgIF1cbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGJlZ2luS2V5d29yZHM6ICdjb25zdHJ1Y3RvciBnZXQgc2V0JywgZW5kOiAvXFx7LywgZXhjbHVkZUVuZDogdHJ1ZVxuICAgICAgfVxuICAgIF0sXG4gICAgaWxsZWdhbDogLyMoPyEhKS9cbiAgfTtcbn07IiwiLy8gWW91IGNhbiB3cml0ZSBhIGNhbGwgYW5kIGltcG9ydCB5b3VyIGZ1bmN0aW9ucyBpbiB0aGlzIGZpbGUuXG4vL1xuLy8gVGhpcyBmaWxlIHdpbGwgYmUgY29tcGlsZWQgaW50byBhcHAuanMgYW5kIHdpbGwgbm90IGJlIG1pbmlmaWVkLlxuLy8gRmVlbCBmcmVlIHdpdGggdXNpbmcgRVM2IGhlcmUuXG5cbi8vIGltcG9ydCB7TkFNRX0gZnJvbSAnLi9tb2R1bGVzLy4uLic7XG5pbXBvcnQgaGxqcyBmcm9tICdoaWdobGlnaHQuanMvbGliL2hpZ2hsaWdodCc7XG5pbXBvcnQgamF2YXNjcmlwdCBmcm9tICdoaWdobGlnaHQuanMvbGliL2xhbmd1YWdlcy9qYXZhc2NyaXB0JztcbmltcG9ydCBwYWdlVHJhbnNpdGlvbiBmcm9tICcuL21vZHVsZXMvcGFnZVRyYW5zaXRpb24nO1xuaW1wb3J0IGhhbWJ1cmdlciBmcm9tICcuL21vZHVsZXMvaGFtYnVyZ2VyJztcbmltcG9ydCBwYWdlU2Nyb2xsIGZyb20gJy4vbW9kdWxlcy9wYWdlU2Nyb2xsJztcblxuKCgkKSA9PiB7XG4gIC8vIFdoZW4gRE9NIGlzIHJlYWR5XG4gICQoKCkgPT4ge1xuICAgIHBhZ2VUcmFuc2l0aW9uLnRyYW5zaXRpb24oKTtcbiAgICAkKCcjY3VycmVudFllYXInKS50ZXh0KGAke25ldyBEYXRlKCkuZ2V0RnVsbFllYXIoKX1gKTtcbiAgICBwYWdlU2Nyb2xsLnNtb290aFNjcm9sbGluZygpO1xuICAgIGhhbWJ1cmdlci5oYW5kbGVyKCk7XG4gICAgaGxqcy5yZWdpc3Rlckxhbmd1YWdlKCdqYXZhc2NyaXB0JywgamF2YXNjcmlwdCk7XG4gICAgaGxqcy5pbml0SGlnaGxpZ2h0aW5nT25Mb2FkKCk7XG4gIH0pO1xufSkoalF1ZXJ5KTtcbiIsImNvbnN0IGhhbWJ1cmdlciA9IHtcbiAgaGFuZGxlcigpIHtcbiAgICBjb25zdCAkYm9keSA9ICQoJ2JvZHknKTtcbiAgICBjb25zdCAkYnRuID0gJCgnLmhhbWJ1cmdlcicpO1xuICAgIGNvbnN0ICRtZW51ID0gJCgnLm1lbnUnKTtcbiAgICBjb25zdCAkc3VibWVudSA9ICQoJy5zdWJtZW51Jyk7XG4gICAgY29uc3QgJHN1Ym1lbnVMaW5rID0gJCgnLm1lbnVfX2xpbmstLXN1Ym1lbnUnKTtcbiAgICBjb25zdCAkc3VibWVudUNsb3NlID0gJCgnLnN1Ym1lbnVfX2l0ZW0tLXN0YXRpYycpO1xuICAgIGNvbnN0IE9QRU5FRF9DTEFTUyA9ICdvcGVuZWQnO1xuICAgIGNvbnN0IE9WRVJMQVlfQ0xBU1MgPSAnb3ZlcmxheSc7XG4gICAgZnVuY3Rpb24gaGFtYnVyZ2VyVG9nZ2xlKCkge1xuICAgICAgJGJ0bi5vbignY2xpY2snLCBmdW5jdGlvbiBzd2l0Y2hlcigpIHtcbiAgICAgICAgJCh0aGlzKS50b2dnbGVDbGFzcyhPUEVORURfQ0xBU1MpO1xuICAgICAgICAkbWVudS50b2dnbGVDbGFzcyhPUEVORURfQ0xBU1MpO1xuICAgICAgICAkYm9keS50b2dnbGVDbGFzcyhPVkVSTEFZX0NMQVNTKTtcbiAgICAgICAgJHN1Ym1lbnUucmVtb3ZlQ2xhc3MoT1BFTkVEX0NMQVNTKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBmdW5jdGlvbiBzdWJtZW51VG9nZ2xlKCkge1xuICAgICAgJHN1Ym1lbnVMaW5rLm9uKCdjbGljaycsIChldmVudCkgPT4ge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAkc3VibWVudS50b2dnbGVDbGFzcyhPUEVORURfQ0xBU1MpO1xuICAgICAgfSk7XG4gICAgICAkc3VibWVudUNsb3NlLm9uKCdjbGljaycsIChldmVudCkgPT4ge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAkc3VibWVudS50b2dnbGVDbGFzcyhPUEVORURfQ0xBU1MpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGluaXQoKSB7XG4gICAgICBpZiAoISRidG4ubGVuZ3RoKSByZXR1cm47XG4gICAgICBoYW1idXJnZXJUb2dnbGUoKTtcbiAgICAgIGlmICghJHN1Ym1lbnUubGVuZ3RoKSByZXR1cm47XG4gICAgICBzdWJtZW51VG9nZ2xlKCk7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICBpbml0OiBpbml0KCksXG4gICAgfTtcbiAgfSxcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGhhbWJ1cmdlcjtcbiIsImNvbnN0IHBhZ2VTY3JvbGwgPSB7XG4gIHNtb290aFNjcm9sbGluZygpIHtcbiAgICBjb25zdCAkd2luZG93ID0gJCh3aW5kb3cpO1xuICAgIGNvbnN0ICRwYWdlID0gJCgnaHRtbCwgYm9keScpO1xuICAgIGNvbnN0ICRib2R5ID0gJCgnYm9keScpO1xuICAgIGNvbnN0ICRtZW51ID0gJCgnLm1lbnUnKTtcbiAgICBjb25zdCAkYW5jaG9yTGluayA9ICQoJ2FbaHJlZl49XCIjXCJdJyk7XG4gICAgY29uc3QgQU5JTUFUSU9OX1NQRUVEID0gNDAwO1xuICAgIGNvbnN0IEhFQURFUl9IRUlHSFQgPSAwO1xuICAgIGNvbnN0IE9WRVJGTE9XX0NMQVNTID0gJ292ZXJmbG93LWhpZGRlbic7XG4gICAgY29uc3QgTU9CSUxFX1ZJRVdfT04gPSAxMDI0O1xuICAgIGZ1bmN0aW9uIHNjcm9sbGluZygpIHtcbiAgICAgICRhbmNob3JMaW5rLm9uKCdjbGljaycsIGZ1bmN0aW9uIHNjcm9sbFRvKGV2ZW50KSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGNvbnN0ICRwb3NpdGlvbiA9ICQoJC5hdHRyKHRoaXMsICdocmVmJykpLm9mZnNldCgpLnRvcDtcbiAgICAgICAgJHBhZ2UuYW5pbWF0ZSh7XG4gICAgICAgICAgc2Nyb2xsVG9wOiBgJHskcG9zaXRpb24gLSBIRUFERVJfSEVJR0hUfXB4YCxcbiAgICAgICAgfSwgQU5JTUFUSU9OX1NQRUVEKTtcbiAgICAgICAgaWYgKCR3aW5kb3cud2lkdGgoKSA8PSBNT0JJTEVfVklFV19PTikge1xuICAgICAgICAgICRtZW51LmZhZGVPdXQoKTtcbiAgICAgICAgICAkYm9keS5yZW1vdmVDbGFzcyhPVkVSRkxPV19DTEFTUyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGluaXQoKSB7XG4gICAgICBpZiAoISRwYWdlLmxlbmd0aCkgcmV0dXJuO1xuICAgICAgc2Nyb2xsaW5nKCk7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICBpbml0OiBpbml0KCksXG4gICAgfTtcbiAgfSxcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHBhZ2VTY3JvbGw7XG4iLCJjb25zdCBwYWdlVHJhbnNpdGlvbiA9IHtcbiAgdHJhbnNpdGlvbigpIHtcbiAgICBjb25zdCAkYm9keSA9ICQoJ2JvZHknKTtcbiAgICBjb25zdCAkbmF2TGluayA9ICQoJy5tZW51X19saW5rJyk7XG4gICAgY29uc3QgJGJsb2dMaW5rID0gJCgnLmJsb2dfX3Bvc3QgYScpO1xuICAgIGNvbnN0ICRiYWNrTGluayA9ICQoJy5iYWNrLXRvLWJsb2cnKTtcbiAgICBmdW5jdGlvbiBwYWdlT25Mb2FkKCkge1xuICAgICAgJGJvZHkuZmFkZUluKDEwMDApO1xuICAgIH1cbiAgICBmdW5jdGlvbiBmYWRlT3V0T25DbGljayhsaW5rKSB7XG4gICAgICBsaW5rLm9uKCdjbGljaycsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBjb25zdCBsaW5rTG9jYXRpb24gPSB0aGlzLmhyZWY7XG4gICAgICAgICRib2R5LmZhZGVPdXQoMTAwMCwgKCkgPT4ge1xuICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGxpbmtMb2NhdGlvbjtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgZnVuY3Rpb24gaW5pdCgpIHtcbiAgICAgIGlmICghJGJvZHkubGVuZ3RoKSByZXR1cm47XG4gICAgICAkKHdpbmRvdykub24oJ2xvYWQnLCBwYWdlT25Mb2FkKCkpO1xuICAgICAgZmFkZU91dE9uQ2xpY2soJG5hdkxpbmspO1xuICAgICAgZmFkZU91dE9uQ2xpY2soJGJsb2dMaW5rKTtcbiAgICAgIGZhZGVPdXRPbkNsaWNrKCRiYWNrTGluayk7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICBpbml0OiBpbml0KCksXG4gICAgfTtcbiAgfSxcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHBhZ2VUcmFuc2l0aW9uO1xuIl19
