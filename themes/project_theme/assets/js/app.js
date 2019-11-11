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

var _hamburger = require('./modules/hamburger');

var _hamburger2 = _interopRequireDefault(_hamburger);

var _pageScroll = require('./modules/pageScroll');

var _pageScroll2 = _interopRequireDefault(_pageScroll);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// You can write a call and import your functions in this file.
//
// This file will be compiled into app.js and will not be minified.
// Feel free with using ES6 here.

// import {NAME} from './modules/...';
(function ($) {
  // When DOM is ready
  $(function () {
    $('#currentYear').text('' + new Date().getFullYear());
    _pageScroll2.default.smoothScrolling();
    _hamburger2.default.handler();
    _highlight2.default.registerLanguage('javascript', _javascript2.default);
    _highlight2.default.initHighlightingOnLoad();
  });
})(jQuery);

},{"./modules/hamburger":4,"./modules/pageScroll":5,"highlight.js/lib/highlight":1,"highlight.js/lib/languages/javascript":2}],4:[function(require,module,exports){
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

},{}]},{},[3])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvaGlnaGxpZ2h0LmpzL2xpYi9oaWdobGlnaHQuanMiLCJub2RlX21vZHVsZXMvaGlnaGxpZ2h0LmpzL2xpYi9sYW5ndWFnZXMvamF2YXNjcmlwdC5qcyIsInRoZW1lcy9wcm9qZWN0X3RoZW1lL3NyYy9qcy9hcHAuanMiLCJ0aGVtZXMvcHJvamVjdF90aGVtZS9zcmMvanMvbW9kdWxlcy9oYW1idXJnZXIuanMiLCJ0aGVtZXMvcHJvamVjdF90aGVtZS9zcmMvanMvbW9kdWxlcy9wYWdlU2Nyb2xsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0Z0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2xNQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7Ozs7O0FBVEE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFNQSxDQUFDLFVBQUMsQ0FBRCxFQUFPO0FBQ047QUFDQSxJQUFFLFlBQU07QUFDTixNQUFFLGNBQUYsRUFBa0IsSUFBbEIsTUFBMEIsSUFBSSxJQUFKLEdBQVcsV0FBWCxFQUExQjtBQUNBLHlCQUFXLGVBQVg7QUFDQSx3QkFBVSxPQUFWO0FBQ0Esd0JBQUssZ0JBQUwsQ0FBc0IsWUFBdEIsRUFBb0Msb0JBQXBDO0FBQ0Esd0JBQUssc0JBQUw7QUFDRCxHQU5EO0FBT0QsQ0FURCxFQVNHLE1BVEg7Ozs7Ozs7O0FDWEEsSUFBTSxZQUFZO0FBQ2hCLFNBRGdCLHFCQUNOO0FBQ1IsUUFBTSxRQUFRLEVBQUUsTUFBRixDQUFkO0FBQ0EsUUFBTSxPQUFPLEVBQUUsWUFBRixDQUFiO0FBQ0EsUUFBTSxRQUFRLEVBQUUsT0FBRixDQUFkO0FBQ0EsUUFBTSxXQUFXLEVBQUUsVUFBRixDQUFqQjtBQUNBLFFBQU0sZUFBZSxFQUFFLHNCQUFGLENBQXJCO0FBQ0EsUUFBTSxnQkFBZ0IsRUFBRSx3QkFBRixDQUF0QjtBQUNBLFFBQU0sZUFBZSxRQUFyQjtBQUNBLFFBQU0sZ0JBQWdCLFNBQXRCO0FBQ0EsYUFBUyxlQUFULEdBQTJCO0FBQ3pCLFdBQUssRUFBTCxDQUFRLE9BQVIsRUFBaUIsU0FBUyxRQUFULEdBQW9CO0FBQ25DLFVBQUUsSUFBRixFQUFRLFdBQVIsQ0FBb0IsWUFBcEI7QUFDQSxjQUFNLFdBQU4sQ0FBa0IsWUFBbEI7QUFDQSxjQUFNLFdBQU4sQ0FBa0IsYUFBbEI7QUFDQSxpQkFBUyxXQUFULENBQXFCLFlBQXJCO0FBQ0QsT0FMRDtBQU1EO0FBQ0QsYUFBUyxhQUFULEdBQXlCO0FBQ3ZCLG1CQUFhLEVBQWIsQ0FBZ0IsT0FBaEIsRUFBeUIsVUFBQyxLQUFELEVBQVc7QUFDbEMsY0FBTSxjQUFOO0FBQ0EsaUJBQVMsV0FBVCxDQUFxQixZQUFyQjtBQUNELE9BSEQ7QUFJQSxvQkFBYyxFQUFkLENBQWlCLE9BQWpCLEVBQTBCLFVBQUMsS0FBRCxFQUFXO0FBQ25DLGNBQU0sY0FBTjtBQUNBLGlCQUFTLFdBQVQsQ0FBcUIsWUFBckI7QUFDRCxPQUhEO0FBSUQ7QUFDRCxhQUFTLElBQVQsR0FBZ0I7QUFDZCxVQUFJLENBQUMsS0FBSyxNQUFWLEVBQWtCO0FBQ2xCO0FBQ0EsVUFBSSxDQUFDLFNBQVMsTUFBZCxFQUFzQjtBQUN0QjtBQUNEO0FBQ0QsV0FBTztBQUNMLFlBQU07QUFERCxLQUFQO0FBR0Q7QUFyQ2UsQ0FBbEI7O2tCQXdDZSxTOzs7Ozs7OztBQ3hDZixJQUFNLGFBQWE7QUFDakIsaUJBRGlCLDZCQUNDO0FBQ2hCLFFBQU0sVUFBVSxFQUFFLE1BQUYsQ0FBaEI7QUFDQSxRQUFNLFFBQVEsRUFBRSxZQUFGLENBQWQ7QUFDQSxRQUFNLFFBQVEsRUFBRSxNQUFGLENBQWQ7QUFDQSxRQUFNLFFBQVEsRUFBRSxPQUFGLENBQWQ7QUFDQSxRQUFNLGNBQWMsRUFBRSxjQUFGLENBQXBCO0FBQ0EsUUFBTSxrQkFBa0IsR0FBeEI7QUFDQSxRQUFNLGdCQUFnQixDQUF0QjtBQUNBLFFBQU0saUJBQWlCLGlCQUF2QjtBQUNBLFFBQU0saUJBQWlCLElBQXZCO0FBQ0EsYUFBUyxTQUFULEdBQXFCO0FBQ25CLGtCQUFZLEVBQVosQ0FBZSxPQUFmLEVBQXdCLFNBQVMsUUFBVCxDQUFrQixLQUFsQixFQUF5QjtBQUMvQyxjQUFNLGNBQU47QUFDQSxZQUFNLFlBQVksRUFBRSxFQUFFLElBQUYsQ0FBTyxJQUFQLEVBQWEsTUFBYixDQUFGLEVBQXdCLE1BQXhCLEdBQWlDLEdBQW5EO0FBQ0EsY0FBTSxPQUFOLENBQWM7QUFDWixxQkFBYyxZQUFZLGFBQTFCO0FBRFksU0FBZCxFQUVHLGVBRkg7QUFHQSxZQUFJLFFBQVEsS0FBUixNQUFtQixjQUF2QixFQUF1QztBQUNyQyxnQkFBTSxPQUFOO0FBQ0EsZ0JBQU0sV0FBTixDQUFrQixjQUFsQjtBQUNEO0FBQ0QsZUFBTyxLQUFQO0FBQ0QsT0FYRDtBQVlEO0FBQ0QsYUFBUyxJQUFULEdBQWdCO0FBQ2QsVUFBSSxDQUFDLE1BQU0sTUFBWCxFQUFtQjtBQUNuQjtBQUNEO0FBQ0QsV0FBTztBQUNMLFlBQU07QUFERCxLQUFQO0FBR0Q7QUFoQ2dCLENBQW5COztrQkFtQ2UsVSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIi8qXG5TeW50YXggaGlnaGxpZ2h0aW5nIHdpdGggbGFuZ3VhZ2UgYXV0b2RldGVjdGlvbi5cbmh0dHBzOi8vaGlnaGxpZ2h0anMub3JnL1xuKi9cblxuKGZ1bmN0aW9uKGZhY3RvcnkpIHtcblxuICAvLyBGaW5kIHRoZSBnbG9iYWwgb2JqZWN0IGZvciBleHBvcnQgdG8gYm90aCB0aGUgYnJvd3NlciBhbmQgd2ViIHdvcmtlcnMuXG4gIHZhciBnbG9iYWxPYmplY3QgPSB0eXBlb2Ygd2luZG93ID09PSAnb2JqZWN0JyAmJiB3aW5kb3cgfHxcbiAgICAgICAgICAgICAgICAgICAgIHR5cGVvZiBzZWxmID09PSAnb2JqZWN0JyAmJiBzZWxmO1xuXG4gIC8vIFNldHVwIGhpZ2hsaWdodC5qcyBmb3IgZGlmZmVyZW50IGVudmlyb25tZW50cy4gRmlyc3QgaXMgTm9kZS5qcyBvclxuICAvLyBDb21tb25KUy5cbiAgLy8gYG5vZGVUeXBlYCBpcyBjaGVja2VkIHRvIGVuc3VyZSB0aGF0IGBleHBvcnRzYCBpcyBub3QgYSBIVE1MIGVsZW1lbnQuXG4gIGlmKHR5cGVvZiBleHBvcnRzICE9PSAndW5kZWZpbmVkJyAmJiAhZXhwb3J0cy5ub2RlVHlwZSkge1xuICAgIGZhY3RvcnkoZXhwb3J0cyk7XG4gIH0gZWxzZSBpZihnbG9iYWxPYmplY3QpIHtcbiAgICAvLyBFeHBvcnQgaGxqcyBnbG9iYWxseSBldmVuIHdoZW4gdXNpbmcgQU1EIGZvciBjYXNlcyB3aGVuIHRoaXMgc2NyaXB0XG4gICAgLy8gaXMgbG9hZGVkIHdpdGggb3RoZXJzIHRoYXQgbWF5IHN0aWxsIGV4cGVjdCBhIGdsb2JhbCBobGpzLlxuICAgIGdsb2JhbE9iamVjdC5obGpzID0gZmFjdG9yeSh7fSk7XG5cbiAgICAvLyBGaW5hbGx5IHJlZ2lzdGVyIHRoZSBnbG9iYWwgaGxqcyB3aXRoIEFNRC5cbiAgICBpZih0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAgIGRlZmluZShbXSwgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBnbG9iYWxPYmplY3QuaGxqcztcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG59KGZ1bmN0aW9uKGhsanMpIHtcbiAgLy8gQ29udmVuaWVuY2UgdmFyaWFibGVzIGZvciBidWlsZC1pbiBvYmplY3RzXG4gIHZhciBBcnJheVByb3RvID0gW10sXG4gICAgICBvYmplY3RLZXlzID0gT2JqZWN0LmtleXM7XG5cbiAgLy8gR2xvYmFsIGludGVybmFsIHZhcmlhYmxlcyB1c2VkIHdpdGhpbiB0aGUgaGlnaGxpZ2h0LmpzIGxpYnJhcnkuXG4gIHZhciBsYW5ndWFnZXMgPSB7fSxcbiAgICAgIGFsaWFzZXMgICA9IHt9O1xuXG4gIC8vIFJlZ3VsYXIgZXhwcmVzc2lvbnMgdXNlZCB0aHJvdWdob3V0IHRoZSBoaWdobGlnaHQuanMgbGlicmFyeS5cbiAgdmFyIG5vSGlnaGxpZ2h0UmUgICAgPSAvXihuby0/aGlnaGxpZ2h0fHBsYWlufHRleHQpJC9pLFxuICAgICAgbGFuZ3VhZ2VQcmVmaXhSZSA9IC9cXGJsYW5nKD86dWFnZSk/LShbXFx3LV0rKVxcYi9pLFxuICAgICAgZml4TWFya3VwUmUgICAgICA9IC8oKF4oPFtePl0rPnxcXHR8KSt8KD86XFxuKSkpL2dtO1xuXG4gIC8vIFRoZSBvYmplY3Qgd2lsbCBiZSBhc3NpZ25lZCBieSB0aGUgYnVpbGQgdG9vbC4gSXQgdXNlZCB0byBzeW5jaHJvbml6ZSBBUElcbiAgLy8gb2YgZXh0ZXJuYWwgbGFuZ3VhZ2UgZmlsZXMgd2l0aCBtaW5pZmllZCB2ZXJzaW9uIG9mIHRoZSBoaWdobGlnaHQuanMgbGlicmFyeS5cbiAgdmFyIEFQSV9SRVBMQUNFUztcblxuICB2YXIgc3BhbkVuZFRhZyA9ICc8L3NwYW4+JztcblxuICAvLyBHbG9iYWwgb3B0aW9ucyB1c2VkIHdoZW4gd2l0aGluIGV4dGVybmFsIEFQSXMuIFRoaXMgaXMgbW9kaWZpZWQgd2hlblxuICAvLyBjYWxsaW5nIHRoZSBgaGxqcy5jb25maWd1cmVgIGZ1bmN0aW9uLlxuICB2YXIgb3B0aW9ucyA9IHtcbiAgICBjbGFzc1ByZWZpeDogJ2hsanMtJyxcbiAgICB0YWJSZXBsYWNlOiBudWxsLFxuICAgIHVzZUJSOiBmYWxzZSxcbiAgICBsYW5ndWFnZXM6IHVuZGVmaW5lZFxuICB9O1xuXG4gIC8vIGtleXdvcmRzIHRoYXQgc2hvdWxkIGhhdmUgbm8gZGVmYXVsdCByZWxldmFuY2UgdmFsdWVcbiAgdmFyIENPTU1PTl9LRVlXT1JEUyA9ICdvZiBhbmQgZm9yIGluIG5vdCBvciBpZiB0aGVuJy5zcGxpdCgnICcpXG5cblxuICAvKiBVdGlsaXR5IGZ1bmN0aW9ucyAqL1xuXG4gIGZ1bmN0aW9uIGVzY2FwZSh2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZS5yZXBsYWNlKC8mL2csICcmYW1wOycpLnJlcGxhY2UoLzwvZywgJyZsdDsnKS5yZXBsYWNlKC8+L2csICcmZ3Q7Jyk7XG4gIH1cblxuICBmdW5jdGlvbiB0YWcobm9kZSkge1xuICAgIHJldHVybiBub2RlLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCk7XG4gIH1cblxuICBmdW5jdGlvbiB0ZXN0UmUocmUsIGxleGVtZSkge1xuICAgIHZhciBtYXRjaCA9IHJlICYmIHJlLmV4ZWMobGV4ZW1lKTtcbiAgICByZXR1cm4gbWF0Y2ggJiYgbWF0Y2guaW5kZXggPT09IDA7XG4gIH1cblxuICBmdW5jdGlvbiBpc05vdEhpZ2hsaWdodGVkKGxhbmd1YWdlKSB7XG4gICAgcmV0dXJuIG5vSGlnaGxpZ2h0UmUudGVzdChsYW5ndWFnZSk7XG4gIH1cblxuICBmdW5jdGlvbiBibG9ja0xhbmd1YWdlKGJsb2NrKSB7XG4gICAgdmFyIGksIG1hdGNoLCBsZW5ndGgsIF9jbGFzcztcbiAgICB2YXIgY2xhc3NlcyA9IGJsb2NrLmNsYXNzTmFtZSArICcgJztcblxuICAgIGNsYXNzZXMgKz0gYmxvY2sucGFyZW50Tm9kZSA/IGJsb2NrLnBhcmVudE5vZGUuY2xhc3NOYW1lIDogJyc7XG5cbiAgICAvLyBsYW5ndWFnZS0qIHRha2VzIHByZWNlZGVuY2Ugb3ZlciBub24tcHJlZml4ZWQgY2xhc3MgbmFtZXMuXG4gICAgbWF0Y2ggPSBsYW5ndWFnZVByZWZpeFJlLmV4ZWMoY2xhc3Nlcyk7XG4gICAgaWYgKG1hdGNoKSB7XG4gICAgICByZXR1cm4gZ2V0TGFuZ3VhZ2UobWF0Y2hbMV0pID8gbWF0Y2hbMV0gOiAnbm8taGlnaGxpZ2h0JztcbiAgICB9XG5cbiAgICBjbGFzc2VzID0gY2xhc3Nlcy5zcGxpdCgvXFxzKy8pO1xuXG4gICAgZm9yIChpID0gMCwgbGVuZ3RoID0gY2xhc3Nlcy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgX2NsYXNzID0gY2xhc3Nlc1tpXTtcblxuICAgICAgaWYgKGlzTm90SGlnaGxpZ2h0ZWQoX2NsYXNzKSB8fCBnZXRMYW5ndWFnZShfY2xhc3MpKSB7XG4gICAgICAgIHJldHVybiBfY2xhc3M7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gaW5oZXJpdChwYXJlbnQpIHsgIC8vIGluaGVyaXQocGFyZW50LCBvdmVycmlkZV9vYmosIG92ZXJyaWRlX29iaiwgLi4uKVxuICAgIHZhciBrZXk7XG4gICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgIHZhciBvYmplY3RzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcblxuICAgIGZvciAoa2V5IGluIHBhcmVudClcbiAgICAgIHJlc3VsdFtrZXldID0gcGFyZW50W2tleV07XG4gICAgb2JqZWN0cy5mb3JFYWNoKGZ1bmN0aW9uKG9iaikge1xuICAgICAgZm9yIChrZXkgaW4gb2JqKVxuICAgICAgICByZXN1bHRba2V5XSA9IG9ialtrZXldO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKiBTdHJlYW0gbWVyZ2luZyAqL1xuXG4gIGZ1bmN0aW9uIG5vZGVTdHJlYW0obm9kZSkge1xuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICAoZnVuY3Rpb24gX25vZGVTdHJlYW0obm9kZSwgb2Zmc2V0KSB7XG4gICAgICBmb3IgKHZhciBjaGlsZCA9IG5vZGUuZmlyc3RDaGlsZDsgY2hpbGQ7IGNoaWxkID0gY2hpbGQubmV4dFNpYmxpbmcpIHtcbiAgICAgICAgaWYgKGNoaWxkLm5vZGVUeXBlID09PSAzKVxuICAgICAgICAgIG9mZnNldCArPSBjaGlsZC5ub2RlVmFsdWUubGVuZ3RoO1xuICAgICAgICBlbHNlIGlmIChjaGlsZC5ub2RlVHlwZSA9PT0gMSkge1xuICAgICAgICAgIHJlc3VsdC5wdXNoKHtcbiAgICAgICAgICAgIGV2ZW50OiAnc3RhcnQnLFxuICAgICAgICAgICAgb2Zmc2V0OiBvZmZzZXQsXG4gICAgICAgICAgICBub2RlOiBjaGlsZFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIG9mZnNldCA9IF9ub2RlU3RyZWFtKGNoaWxkLCBvZmZzZXQpO1xuICAgICAgICAgIC8vIFByZXZlbnQgdm9pZCBlbGVtZW50cyBmcm9tIGhhdmluZyBhbiBlbmQgdGFnIHRoYXQgd291bGQgYWN0dWFsbHlcbiAgICAgICAgICAvLyBkb3VibGUgdGhlbSBpbiB0aGUgb3V0cHV0LiBUaGVyZSBhcmUgbW9yZSB2b2lkIGVsZW1lbnRzIGluIEhUTUxcbiAgICAgICAgICAvLyBidXQgd2UgbGlzdCBvbmx5IHRob3NlIHJlYWxpc3RpY2FsbHkgZXhwZWN0ZWQgaW4gY29kZSBkaXNwbGF5LlxuICAgICAgICAgIGlmICghdGFnKGNoaWxkKS5tYXRjaCgvYnJ8aHJ8aW1nfGlucHV0LykpIHtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKHtcbiAgICAgICAgICAgICAgZXZlbnQ6ICdzdG9wJyxcbiAgICAgICAgICAgICAgb2Zmc2V0OiBvZmZzZXQsXG4gICAgICAgICAgICAgIG5vZGU6IGNoaWxkXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBvZmZzZXQ7XG4gICAgfSkobm9kZSwgMCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGZ1bmN0aW9uIG1lcmdlU3RyZWFtcyhvcmlnaW5hbCwgaGlnaGxpZ2h0ZWQsIHZhbHVlKSB7XG4gICAgdmFyIHByb2Nlc3NlZCA9IDA7XG4gICAgdmFyIHJlc3VsdCA9ICcnO1xuICAgIHZhciBub2RlU3RhY2sgPSBbXTtcblxuICAgIGZ1bmN0aW9uIHNlbGVjdFN0cmVhbSgpIHtcbiAgICAgIGlmICghb3JpZ2luYWwubGVuZ3RoIHx8ICFoaWdobGlnaHRlZC5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIG9yaWdpbmFsLmxlbmd0aCA/IG9yaWdpbmFsIDogaGlnaGxpZ2h0ZWQ7XG4gICAgICB9XG4gICAgICBpZiAob3JpZ2luYWxbMF0ub2Zmc2V0ICE9PSBoaWdobGlnaHRlZFswXS5vZmZzZXQpIHtcbiAgICAgICAgcmV0dXJuIChvcmlnaW5hbFswXS5vZmZzZXQgPCBoaWdobGlnaHRlZFswXS5vZmZzZXQpID8gb3JpZ2luYWwgOiBoaWdobGlnaHRlZDtcbiAgICAgIH1cblxuICAgICAgLypcbiAgICAgIFRvIGF2b2lkIHN0YXJ0aW5nIHRoZSBzdHJlYW0ganVzdCBiZWZvcmUgaXQgc2hvdWxkIHN0b3AgdGhlIG9yZGVyIGlzXG4gICAgICBlbnN1cmVkIHRoYXQgb3JpZ2luYWwgYWx3YXlzIHN0YXJ0cyBmaXJzdCBhbmQgY2xvc2VzIGxhc3Q6XG5cbiAgICAgIGlmIChldmVudDEgPT0gJ3N0YXJ0JyAmJiBldmVudDIgPT0gJ3N0YXJ0JylcbiAgICAgICAgcmV0dXJuIG9yaWdpbmFsO1xuICAgICAgaWYgKGV2ZW50MSA9PSAnc3RhcnQnICYmIGV2ZW50MiA9PSAnc3RvcCcpXG4gICAgICAgIHJldHVybiBoaWdobGlnaHRlZDtcbiAgICAgIGlmIChldmVudDEgPT0gJ3N0b3AnICYmIGV2ZW50MiA9PSAnc3RhcnQnKVxuICAgICAgICByZXR1cm4gb3JpZ2luYWw7XG4gICAgICBpZiAoZXZlbnQxID09ICdzdG9wJyAmJiBldmVudDIgPT0gJ3N0b3AnKVxuICAgICAgICByZXR1cm4gaGlnaGxpZ2h0ZWQ7XG5cbiAgICAgIC4uLiB3aGljaCBpcyBjb2xsYXBzZWQgdG86XG4gICAgICAqL1xuICAgICAgcmV0dXJuIGhpZ2hsaWdodGVkWzBdLmV2ZW50ID09PSAnc3RhcnQnID8gb3JpZ2luYWwgOiBoaWdobGlnaHRlZDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvcGVuKG5vZGUpIHtcbiAgICAgIGZ1bmN0aW9uIGF0dHJfc3RyKGEpIHtyZXR1cm4gJyAnICsgYS5ub2RlTmFtZSArICc9XCInICsgZXNjYXBlKGEudmFsdWUpLnJlcGxhY2UoJ1wiJywgJyZxdW90OycpICsgJ1wiJzt9XG4gICAgICByZXN1bHQgKz0gJzwnICsgdGFnKG5vZGUpICsgQXJyYXlQcm90by5tYXAuY2FsbChub2RlLmF0dHJpYnV0ZXMsIGF0dHJfc3RyKS5qb2luKCcnKSArICc+JztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjbG9zZShub2RlKSB7XG4gICAgICByZXN1bHQgKz0gJzwvJyArIHRhZyhub2RlKSArICc+JztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZW5kZXIoZXZlbnQpIHtcbiAgICAgIChldmVudC5ldmVudCA9PT0gJ3N0YXJ0JyA/IG9wZW4gOiBjbG9zZSkoZXZlbnQubm9kZSk7XG4gICAgfVxuXG4gICAgd2hpbGUgKG9yaWdpbmFsLmxlbmd0aCB8fCBoaWdobGlnaHRlZC5sZW5ndGgpIHtcbiAgICAgIHZhciBzdHJlYW0gPSBzZWxlY3RTdHJlYW0oKTtcbiAgICAgIHJlc3VsdCArPSBlc2NhcGUodmFsdWUuc3Vic3RyaW5nKHByb2Nlc3NlZCwgc3RyZWFtWzBdLm9mZnNldCkpO1xuICAgICAgcHJvY2Vzc2VkID0gc3RyZWFtWzBdLm9mZnNldDtcbiAgICAgIGlmIChzdHJlYW0gPT09IG9yaWdpbmFsKSB7XG4gICAgICAgIC8qXG4gICAgICAgIE9uIGFueSBvcGVuaW5nIG9yIGNsb3NpbmcgdGFnIG9mIHRoZSBvcmlnaW5hbCBtYXJrdXAgd2UgZmlyc3QgY2xvc2VcbiAgICAgICAgdGhlIGVudGlyZSBoaWdobGlnaHRlZCBub2RlIHN0YWNrLCB0aGVuIHJlbmRlciB0aGUgb3JpZ2luYWwgdGFnIGFsb25nXG4gICAgICAgIHdpdGggYWxsIHRoZSBmb2xsb3dpbmcgb3JpZ2luYWwgdGFncyBhdCB0aGUgc2FtZSBvZmZzZXQgYW5kIHRoZW5cbiAgICAgICAgcmVvcGVuIGFsbCB0aGUgdGFncyBvbiB0aGUgaGlnaGxpZ2h0ZWQgc3RhY2suXG4gICAgICAgICovXG4gICAgICAgIG5vZGVTdGFjay5yZXZlcnNlKCkuZm9yRWFjaChjbG9zZSk7XG4gICAgICAgIGRvIHtcbiAgICAgICAgICByZW5kZXIoc3RyZWFtLnNwbGljZSgwLCAxKVswXSk7XG4gICAgICAgICAgc3RyZWFtID0gc2VsZWN0U3RyZWFtKCk7XG4gICAgICAgIH0gd2hpbGUgKHN0cmVhbSA9PT0gb3JpZ2luYWwgJiYgc3RyZWFtLmxlbmd0aCAmJiBzdHJlYW1bMF0ub2Zmc2V0ID09PSBwcm9jZXNzZWQpO1xuICAgICAgICBub2RlU3RhY2sucmV2ZXJzZSgpLmZvckVhY2gob3Blbik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoc3RyZWFtWzBdLmV2ZW50ID09PSAnc3RhcnQnKSB7XG4gICAgICAgICAgbm9kZVN0YWNrLnB1c2goc3RyZWFtWzBdLm5vZGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG5vZGVTdGFjay5wb3AoKTtcbiAgICAgICAgfVxuICAgICAgICByZW5kZXIoc3RyZWFtLnNwbGljZSgwLCAxKVswXSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQgKyBlc2NhcGUodmFsdWUuc3Vic3RyKHByb2Nlc3NlZCkpO1xuICB9XG5cbiAgLyogSW5pdGlhbGl6YXRpb24gKi9cblxuICBmdW5jdGlvbiBkZXBlbmRlbmN5T25QYXJlbnQobW9kZSkge1xuICAgIGlmICghbW9kZSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgcmV0dXJuIG1vZGUuZW5kc1dpdGhQYXJlbnQgfHwgZGVwZW5kZW5jeU9uUGFyZW50KG1vZGUuc3RhcnRzKVxuICB9XG5cbiAgZnVuY3Rpb24gZXhwYW5kX29yX2Nsb25lX21vZGUobW9kZSkge1xuICAgIGlmIChtb2RlLnZhcmlhbnRzICYmICFtb2RlLmNhY2hlZF92YXJpYW50cykge1xuICAgICAgbW9kZS5jYWNoZWRfdmFyaWFudHMgPSBtb2RlLnZhcmlhbnRzLm1hcChmdW5jdGlvbih2YXJpYW50KSB7XG4gICAgICAgIHJldHVybiBpbmhlcml0KG1vZGUsIHt2YXJpYW50czogbnVsbH0sIHZhcmlhbnQpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gRVhQQU5EXG4gICAgLy8gaWYgd2UgaGF2ZSB2YXJpYW50cyB0aGVuIGVzc2VudHVhbGx5IFwicmVwbGFjZVwiIHRoZSBtb2RlIHdpdGggdGhlIHZhcmlhbnRzXG4gICAgLy8gdGhpcyBoYXBwZW5zIGluIGNvbXBpbGVNb2RlLCB3aGVyZSB0aGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCBmcm9tXG4gICAgaWYgKG1vZGUuY2FjaGVkX3ZhcmlhbnRzKVxuICAgICAgcmV0dXJuIG1vZGUuY2FjaGVkX3ZhcmlhbnRzO1xuXG4gICAgLy8gQ0xPTkVcbiAgICAvLyBpZiB3ZSBoYXZlIGRlcGVuZGVuY2llcyBvbiBwYXJlbnRzIHRoZW4gd2UgbmVlZCBhIHVuaXF1ZVxuICAgIC8vIGluc3RhbmNlIG9mIG91cnNlbHZlcywgc28gd2UgY2FuIGJlIHJldXNlZCB3aXRoIG1hbnlcbiAgICAvLyBkaWZmZXJlbnQgcGFyZW50cyB3aXRob3V0IGlzc3VlXG4gICAgaWYgKGRlcGVuZGVuY3lPblBhcmVudChtb2RlKSlcbiAgICAgIHJldHVybiBbaW5oZXJpdChtb2RlLCB7IHN0YXJ0czogbW9kZS5zdGFydHMgPyBpbmhlcml0KG1vZGUuc3RhcnRzKSA6IG51bGwgfSldXG5cbiAgICAvLyBubyBzcGVjaWFsIGRlcGVuZGVuY3kgaXNzdWVzLCBqdXN0IHJldHVybiBvdXJzZWx2ZXNcbiAgICByZXR1cm4gW21vZGVdXG4gIH1cblxuICBmdW5jdGlvbiByZXN0b3JlTGFuZ3VhZ2VBcGkob2JqKSB7XG4gICAgaWYoQVBJX1JFUExBQ0VTICYmICFvYmoubGFuZ0FwaVJlc3RvcmVkKSB7XG4gICAgICBvYmoubGFuZ0FwaVJlc3RvcmVkID0gdHJ1ZTtcbiAgICAgIGZvcih2YXIga2V5IGluIEFQSV9SRVBMQUNFUylcbiAgICAgICAgb2JqW2tleV0gJiYgKG9ialtBUElfUkVQTEFDRVNba2V5XV0gPSBvYmpba2V5XSk7XG4gICAgICAob2JqLmNvbnRhaW5zIHx8IFtdKS5jb25jYXQob2JqLnZhcmlhbnRzIHx8IFtdKS5mb3JFYWNoKHJlc3RvcmVMYW5ndWFnZUFwaSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY29tcGlsZUtleXdvcmRzKHJhd0tleXdvcmRzLCBjYXNlX2luc2Vuc2l0aXZlKSB7XG4gICAgICB2YXIgY29tcGlsZWRfa2V5d29yZHMgPSB7fTtcblxuICAgICAgaWYgKHR5cGVvZiByYXdLZXl3b3JkcyA9PT0gJ3N0cmluZycpIHsgLy8gc3RyaW5nXG4gICAgICAgIHNwbGl0QW5kQ29tcGlsZSgna2V5d29yZCcsIHJhd0tleXdvcmRzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG9iamVjdEtleXMocmF3S2V5d29yZHMpLmZvckVhY2goZnVuY3Rpb24gKGNsYXNzTmFtZSkge1xuICAgICAgICAgIHNwbGl0QW5kQ29tcGlsZShjbGFzc05hbWUsIHJhd0tleXdvcmRzW2NsYXNzTmFtZV0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICByZXR1cm4gY29tcGlsZWRfa2V5d29yZHM7XG5cbiAgICAvLyAtLS1cblxuICAgIGZ1bmN0aW9uIHNwbGl0QW5kQ29tcGlsZShjbGFzc05hbWUsIHN0cikge1xuICAgICAgaWYgKGNhc2VfaW5zZW5zaXRpdmUpIHtcbiAgICAgICAgc3RyID0gc3RyLnRvTG93ZXJDYXNlKCk7XG4gICAgICB9XG4gICAgICBzdHIuc3BsaXQoJyAnKS5mb3JFYWNoKGZ1bmN0aW9uKGtleXdvcmQpIHtcbiAgICAgICAgdmFyIHBhaXIgPSBrZXl3b3JkLnNwbGl0KCd8Jyk7XG4gICAgICAgIGNvbXBpbGVkX2tleXdvcmRzW3BhaXJbMF1dID0gW2NsYXNzTmFtZSwgc2NvcmVGb3JLZXl3b3JkKHBhaXJbMF0sIHBhaXJbMV0pXTtcbiAgICAgIH0pO1xuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBzY29yZUZvcktleXdvcmQoa2V5d29yZCwgcHJvdmlkZWRTY29yZSkge1xuICAgIC8vIG1hbnVhbCBzY29yZXMgYWx3YXlzIHdpbiBvdmVyIGNvbW1vbiBrZXl3b3Jkc1xuICAgIC8vIHNvIHlvdSBjYW4gZm9yY2UgYSBzY29yZSBvZiAxIGlmIHlvdSByZWFsbHkgaW5zaXN0XG4gICAgaWYgKHByb3ZpZGVkU2NvcmUpXG4gICAgICByZXR1cm4gTnVtYmVyKHByb3ZpZGVkU2NvcmUpXG5cbiAgICByZXR1cm4gY29tbW9uS2V5d29yZChrZXl3b3JkKSA/IDAgOiAxO1xuICB9XG5cbiAgZnVuY3Rpb24gY29tbW9uS2V5d29yZCh3b3JkKSB7XG4gICAgcmV0dXJuIENPTU1PTl9LRVlXT1JEUy5pbmRleE9mKHdvcmQudG9Mb3dlckNhc2UoKSkgIT0gLTFcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbXBpbGVMYW5ndWFnZShsYW5ndWFnZSkge1xuXG4gICAgZnVuY3Rpb24gcmVTdHIocmUpIHtcbiAgICAgICAgcmV0dXJuIChyZSAmJiByZS5zb3VyY2UpIHx8IHJlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxhbmdSZSh2YWx1ZSwgZ2xvYmFsKSB7XG4gICAgICByZXR1cm4gbmV3IFJlZ0V4cChcbiAgICAgICAgcmVTdHIodmFsdWUpLFxuICAgICAgICAnbScgKyAobGFuZ3VhZ2UuY2FzZV9pbnNlbnNpdGl2ZSA/ICdpJyA6ICcnKSArIChnbG9iYWwgPyAnZycgOiAnJylcbiAgICAgICk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVDb3VudE1hdGNoR3JvdXBzKHJlKSB7XG4gICAgICByZXR1cm4gKG5ldyBSZWdFeHAocmUudG9TdHJpbmcoKSArICd8JykpLmV4ZWMoJycpLmxlbmd0aCAtIDE7XG4gICAgfVxuXG4gICAgLy8gam9pblJlIGxvZ2ljYWxseSBjb21wdXRlcyByZWdleHBzLmpvaW4oc2VwYXJhdG9yKSwgYnV0IGZpeGVzIHRoZVxuICAgIC8vIGJhY2tyZWZlcmVuY2VzIHNvIHRoZXkgY29udGludWUgdG8gbWF0Y2guXG4gICAgLy8gaXQgYWxzbyBwbGFjZXMgZWFjaCBpbmRpdmlkdWFsIHJlZ3VsYXIgZXhwcmVzc2lvbiBpbnRvIGl0J3Mgb3duXG4gICAgLy8gbWF0Y2ggZ3JvdXAsIGtlZXBpbmcgdHJhY2sgb2YgdGhlIHNlcXVlbmNpbmcgb2YgdGhvc2UgbWF0Y2ggZ3JvdXBzXG4gICAgLy8gaXMgY3VycmVudGx5IGFuIGV4ZXJjaXNlIGZvciB0aGUgY2FsbGVyLiA6LSlcbiAgICBmdW5jdGlvbiBqb2luUmUocmVnZXhwcywgc2VwYXJhdG9yKSB7XG4gICAgICAvLyBiYWNrcmVmZXJlbmNlUmUgbWF0Y2hlcyBhbiBvcGVuIHBhcmVudGhlc2lzIG9yIGJhY2tyZWZlcmVuY2UuIFRvIGF2b2lkXG4gICAgICAvLyBhbiBpbmNvcnJlY3QgcGFyc2UsIGl0IGFkZGl0aW9uYWxseSBtYXRjaGVzIHRoZSBmb2xsb3dpbmc6XG4gICAgICAvLyAtIFsuLi5dIGVsZW1lbnRzLCB3aGVyZSB0aGUgbWVhbmluZyBvZiBwYXJlbnRoZXNlcyBhbmQgZXNjYXBlcyBjaGFuZ2VcbiAgICAgIC8vIC0gb3RoZXIgZXNjYXBlIHNlcXVlbmNlcywgc28gd2UgZG8gbm90IG1pc3BhcnNlIGVzY2FwZSBzZXF1ZW5jZXMgYXNcbiAgICAgIC8vICAgaW50ZXJlc3RpbmcgZWxlbWVudHNcbiAgICAgIC8vIC0gbm9uLW1hdGNoaW5nIG9yIGxvb2thaGVhZCBwYXJlbnRoZXNlcywgd2hpY2ggZG8gbm90IGNhcHR1cmUuIFRoZXNlXG4gICAgICAvLyAgIGZvbGxvdyB0aGUgJygnIHdpdGggYSAnPycuXG4gICAgICB2YXIgYmFja3JlZmVyZW5jZVJlID0gL1xcWyg/OlteXFxcXFxcXV18XFxcXC4pKlxcXXxcXChcXD8/fFxcXFwoWzEtOV1bMC05XSopfFxcXFwuLztcbiAgICAgIHZhciBudW1DYXB0dXJlcyA9IDA7XG4gICAgICB2YXIgcmV0ID0gJyc7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlZ2V4cHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbnVtQ2FwdHVyZXMgKz0gMTtcbiAgICAgICAgdmFyIG9mZnNldCA9IG51bUNhcHR1cmVzO1xuICAgICAgICB2YXIgcmUgPSByZVN0cihyZWdleHBzW2ldKTtcbiAgICAgICAgaWYgKGkgPiAwKSB7XG4gICAgICAgICAgcmV0ICs9IHNlcGFyYXRvcjtcbiAgICAgICAgfVxuICAgICAgICByZXQgKz0gXCIoXCI7XG4gICAgICAgIHdoaWxlIChyZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgdmFyIG1hdGNoID0gYmFja3JlZmVyZW5jZVJlLmV4ZWMocmUpO1xuICAgICAgICAgIGlmIChtYXRjaCA9PSBudWxsKSB7XG4gICAgICAgICAgICByZXQgKz0gcmU7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0ICs9IHJlLnN1YnN0cmluZygwLCBtYXRjaC5pbmRleCk7XG4gICAgICAgICAgcmUgPSByZS5zdWJzdHJpbmcobWF0Y2guaW5kZXggKyBtYXRjaFswXS5sZW5ndGgpO1xuICAgICAgICAgIGlmIChtYXRjaFswXVswXSA9PSAnXFxcXCcgJiYgbWF0Y2hbMV0pIHtcbiAgICAgICAgICAgIC8vIEFkanVzdCB0aGUgYmFja3JlZmVyZW5jZS5cbiAgICAgICAgICAgIHJldCArPSAnXFxcXCcgKyBTdHJpbmcoTnVtYmVyKG1hdGNoWzFdKSArIG9mZnNldCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldCArPSBtYXRjaFswXTtcbiAgICAgICAgICAgIGlmIChtYXRjaFswXSA9PSAnKCcpIHtcbiAgICAgICAgICAgICAgbnVtQ2FwdHVyZXMrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0ICs9IFwiKVwiO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBidWlsZE1vZGVSZWdleChtb2RlKSB7XG5cbiAgICAgIHZhciBtYXRjaEluZGV4ZXMgPSB7fTtcbiAgICAgIHZhciBtYXRjaGVyUmU7XG4gICAgICB2YXIgcmVnZXhlcyA9IFtdO1xuICAgICAgdmFyIG1hdGNoZXIgPSB7fTtcbiAgICAgIHZhciBtYXRjaEF0ID0gMTtcblxuICAgICAgZnVuY3Rpb24gYWRkUnVsZShydWxlLCByZWdleCkge1xuICAgICAgICBtYXRjaEluZGV4ZXNbbWF0Y2hBdF0gPSBydWxlO1xuICAgICAgICByZWdleGVzLnB1c2goW3J1bGUsIHJlZ2V4XSk7XG4gICAgICAgIG1hdGNoQXQgKz0gcmVDb3VudE1hdGNoR3JvdXBzKHJlZ2V4KSArIDE7XG4gICAgICB9XG5cbiAgICAgIHZhciB0ZXJtO1xuICAgICAgZm9yICh2YXIgaT0wOyBpIDwgbW9kZS5jb250YWlucy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgcmU7XG4gICAgICAgIHRlcm0gPSBtb2RlLmNvbnRhaW5zW2ldO1xuICAgICAgICBpZiAodGVybS5iZWdpbktleXdvcmRzKSB7XG4gICAgICAgICAgcmUgPSAnXFxcXC4/KD86JyArIHRlcm0uYmVnaW4gKyAnKVxcXFwuPyc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmUgPSB0ZXJtLmJlZ2luO1xuICAgICAgICB9XG4gICAgICAgIGFkZFJ1bGUodGVybSwgcmUpO1xuICAgICAgfVxuICAgICAgaWYgKG1vZGUudGVybWluYXRvcl9lbmQpXG4gICAgICAgIGFkZFJ1bGUoXCJlbmRcIiwgbW9kZS50ZXJtaW5hdG9yX2VuZCk7XG4gICAgICBpZiAobW9kZS5pbGxlZ2FsKVxuICAgICAgICBhZGRSdWxlKFwiaWxsZWdhbFwiLCBtb2RlLmlsbGVnYWwpO1xuXG4gICAgICB2YXIgdGVybWluYXRvcnMgPSByZWdleGVzLm1hcChmdW5jdGlvbihlbCkgeyByZXR1cm4gZWxbMV0gfSk7XG4gICAgICBtYXRjaGVyUmUgPSBsYW5nUmUoam9pblJlKHRlcm1pbmF0b3JzLCAnfCcpLCB0cnVlKTtcblxuICAgICAgbWF0Y2hlci5sYXN0SW5kZXggPSAwO1xuICAgICAgbWF0Y2hlci5leGVjID0gZnVuY3Rpb24ocykge1xuICAgICAgICB2YXIgcnVsZTtcblxuICAgICAgICBpZiggcmVnZXhlcy5sZW5ndGggPT09IDApIHJldHVybiBudWxsO1xuXG4gICAgICAgIG1hdGNoZXJSZS5sYXN0SW5kZXggPSBtYXRjaGVyLmxhc3RJbmRleDtcbiAgICAgICAgdmFyIG1hdGNoID0gbWF0Y2hlclJlLmV4ZWMocyk7XG4gICAgICAgIGlmICghbWF0Y2gpIHsgcmV0dXJuIG51bGw7IH1cblxuICAgICAgICBmb3IodmFyIGkgPSAwOyBpPG1hdGNoLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYgKG1hdGNoW2ldICE9IHVuZGVmaW5lZCAmJiBtYXRjaEluZGV4ZXNbXCJcIiAraV0gIT0gdW5kZWZpbmVkICkge1xuICAgICAgICAgICAgcnVsZSA9IG1hdGNoSW5kZXhlc1tcIlwiK2ldO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gaWxsZWdhbCBvciBlbmQgbWF0Y2hcbiAgICAgICAgaWYgKHR5cGVvZiBydWxlID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgbWF0Y2gudHlwZSA9IHJ1bGU7XG4gICAgICAgICAgbWF0Y2guZXh0cmEgPSBbbW9kZS5pbGxlZ2FsLCBtb2RlLnRlcm1pbmF0b3JfZW5kXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBtYXRjaC50eXBlID0gXCJiZWdpblwiO1xuICAgICAgICAgIG1hdGNoLnJ1bGUgPSBydWxlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtYXRjaDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG1hdGNoZXI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY29tcGlsZU1vZGUobW9kZSwgcGFyZW50KSB7XG4gICAgICBpZiAobW9kZS5jb21waWxlZClcbiAgICAgICAgcmV0dXJuO1xuICAgICAgbW9kZS5jb21waWxlZCA9IHRydWU7XG5cbiAgICAgIG1vZGUua2V5d29yZHMgPSBtb2RlLmtleXdvcmRzIHx8IG1vZGUuYmVnaW5LZXl3b3JkcztcbiAgICAgIGlmIChtb2RlLmtleXdvcmRzKVxuICAgICAgICBtb2RlLmtleXdvcmRzID0gY29tcGlsZUtleXdvcmRzKG1vZGUua2V5d29yZHMsIGxhbmd1YWdlLmNhc2VfaW5zZW5zaXRpdmUpXG5cbiAgICAgIG1vZGUubGV4ZW1lc1JlID0gbGFuZ1JlKG1vZGUubGV4ZW1lcyB8fCAvXFx3Ky8sIHRydWUpO1xuXG4gICAgICBpZiAocGFyZW50KSB7XG4gICAgICAgIGlmIChtb2RlLmJlZ2luS2V5d29yZHMpIHtcbiAgICAgICAgICBtb2RlLmJlZ2luID0gJ1xcXFxiKCcgKyBtb2RlLmJlZ2luS2V5d29yZHMuc3BsaXQoJyAnKS5qb2luKCd8JykgKyAnKVxcXFxiJztcbiAgICAgICAgfVxuICAgICAgICBpZiAoIW1vZGUuYmVnaW4pXG4gICAgICAgICAgbW9kZS5iZWdpbiA9IC9cXEJ8XFxiLztcbiAgICAgICAgbW9kZS5iZWdpblJlID0gbGFuZ1JlKG1vZGUuYmVnaW4pO1xuICAgICAgICBpZiAobW9kZS5lbmRTYW1lQXNCZWdpbilcbiAgICAgICAgICBtb2RlLmVuZCA9IG1vZGUuYmVnaW47XG4gICAgICAgIGlmICghbW9kZS5lbmQgJiYgIW1vZGUuZW5kc1dpdGhQYXJlbnQpXG4gICAgICAgICAgbW9kZS5lbmQgPSAvXFxCfFxcYi87XG4gICAgICAgIGlmIChtb2RlLmVuZClcbiAgICAgICAgICBtb2RlLmVuZFJlID0gbGFuZ1JlKG1vZGUuZW5kKTtcbiAgICAgICAgbW9kZS50ZXJtaW5hdG9yX2VuZCA9IHJlU3RyKG1vZGUuZW5kKSB8fCAnJztcbiAgICAgICAgaWYgKG1vZGUuZW5kc1dpdGhQYXJlbnQgJiYgcGFyZW50LnRlcm1pbmF0b3JfZW5kKVxuICAgICAgICAgIG1vZGUudGVybWluYXRvcl9lbmQgKz0gKG1vZGUuZW5kID8gJ3wnIDogJycpICsgcGFyZW50LnRlcm1pbmF0b3JfZW5kO1xuICAgICAgfVxuICAgICAgaWYgKG1vZGUuaWxsZWdhbClcbiAgICAgICAgbW9kZS5pbGxlZ2FsUmUgPSBsYW5nUmUobW9kZS5pbGxlZ2FsKTtcbiAgICAgIGlmIChtb2RlLnJlbGV2YW5jZSA9PSBudWxsKVxuICAgICAgICBtb2RlLnJlbGV2YW5jZSA9IDE7XG4gICAgICBpZiAoIW1vZGUuY29udGFpbnMpIHtcbiAgICAgICAgbW9kZS5jb250YWlucyA9IFtdO1xuICAgICAgfVxuICAgICAgbW9kZS5jb250YWlucyA9IEFycmF5LnByb3RvdHlwZS5jb25jYXQuYXBwbHkoW10sIG1vZGUuY29udGFpbnMubWFwKGZ1bmN0aW9uKGMpIHtcbiAgICAgICAgcmV0dXJuIGV4cGFuZF9vcl9jbG9uZV9tb2RlKGMgPT09ICdzZWxmJyA/IG1vZGUgOiBjKTtcbiAgICAgIH0pKTtcbiAgICAgIG1vZGUuY29udGFpbnMuZm9yRWFjaChmdW5jdGlvbihjKSB7Y29tcGlsZU1vZGUoYywgbW9kZSk7fSk7XG5cbiAgICAgIGlmIChtb2RlLnN0YXJ0cykge1xuICAgICAgICBjb21waWxlTW9kZShtb2RlLnN0YXJ0cywgcGFyZW50KTtcbiAgICAgIH1cblxuICAgICAgbW9kZS50ZXJtaW5hdG9ycyA9IGJ1aWxkTW9kZVJlZ2V4KG1vZGUpO1xuICAgIH1cblxuICAgIGNvbXBpbGVNb2RlKGxhbmd1YWdlKTtcbiAgfVxuXG4gIC8qXG4gIENvcmUgaGlnaGxpZ2h0aW5nIGZ1bmN0aW9uLiBBY2NlcHRzIGEgbGFuZ3VhZ2UgbmFtZSwgb3IgYW4gYWxpYXMsIGFuZCBhXG4gIHN0cmluZyB3aXRoIHRoZSBjb2RlIHRvIGhpZ2hsaWdodC4gUmV0dXJucyBhbiBvYmplY3Qgd2l0aCB0aGUgZm9sbG93aW5nXG4gIHByb3BlcnRpZXM6XG5cbiAgLSByZWxldmFuY2UgKGludClcbiAgLSB2YWx1ZSAoYW4gSFRNTCBzdHJpbmcgd2l0aCBoaWdobGlnaHRpbmcgbWFya3VwKVxuXG4gICovXG4gIGZ1bmN0aW9uIGhpZ2hsaWdodChuYW1lLCB2YWx1ZSwgaWdub3JlX2lsbGVnYWxzLCBjb250aW51YXRpb24pIHtcblxuICAgIGZ1bmN0aW9uIGVzY2FwZVJlKHZhbHVlKSB7XG4gICAgICByZXR1cm4gbmV3IFJlZ0V4cCh2YWx1ZS5yZXBsYWNlKC9bLVxcL1xcXFxeJCorPy4oKXxbXFxde31dL2csICdcXFxcJCYnKSwgJ20nKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBlbmRPZk1vZGUobW9kZSwgbGV4ZW1lKSB7XG4gICAgICBpZiAodGVzdFJlKG1vZGUuZW5kUmUsIGxleGVtZSkpIHtcbiAgICAgICAgd2hpbGUgKG1vZGUuZW5kc1BhcmVudCAmJiBtb2RlLnBhcmVudCkge1xuICAgICAgICAgIG1vZGUgPSBtb2RlLnBhcmVudDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbW9kZTtcbiAgICAgIH1cbiAgICAgIGlmIChtb2RlLmVuZHNXaXRoUGFyZW50KSB7XG4gICAgICAgIHJldHVybiBlbmRPZk1vZGUobW9kZS5wYXJlbnQsIGxleGVtZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24ga2V5d29yZE1hdGNoKG1vZGUsIG1hdGNoKSB7XG4gICAgICB2YXIgbWF0Y2hfc3RyID0gbGFuZ3VhZ2UuY2FzZV9pbnNlbnNpdGl2ZSA/IG1hdGNoWzBdLnRvTG93ZXJDYXNlKCkgOiBtYXRjaFswXTtcbiAgICAgIHJldHVybiBtb2RlLmtleXdvcmRzLmhhc093blByb3BlcnR5KG1hdGNoX3N0cikgJiYgbW9kZS5rZXl3b3Jkc1ttYXRjaF9zdHJdO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGJ1aWxkU3BhbihjbGFzc25hbWUsIGluc2lkZVNwYW4sIGxlYXZlT3Blbiwgbm9QcmVmaXgpIHtcbiAgICAgIGlmICghbGVhdmVPcGVuICYmIGluc2lkZVNwYW4gPT09ICcnKSByZXR1cm4gJyc7XG4gICAgICBpZiAoIWNsYXNzbmFtZSkgcmV0dXJuIGluc2lkZVNwYW47XG5cbiAgICAgIHZhciBjbGFzc1ByZWZpeCA9IG5vUHJlZml4ID8gJycgOiBvcHRpb25zLmNsYXNzUHJlZml4LFxuICAgICAgICAgIG9wZW5TcGFuICAgID0gJzxzcGFuIGNsYXNzPVwiJyArIGNsYXNzUHJlZml4LFxuICAgICAgICAgIGNsb3NlU3BhbiAgID0gbGVhdmVPcGVuID8gJycgOiBzcGFuRW5kVGFnO1xuXG4gICAgICBvcGVuU3BhbiArPSBjbGFzc25hbWUgKyAnXCI+JztcblxuICAgICAgcmV0dXJuIG9wZW5TcGFuICsgaW5zaWRlU3BhbiArIGNsb3NlU3BhbjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwcm9jZXNzS2V5d29yZHMoKSB7XG4gICAgICB2YXIga2V5d29yZF9tYXRjaCwgbGFzdF9pbmRleCwgbWF0Y2gsIHJlc3VsdDtcblxuICAgICAgaWYgKCF0b3Aua2V5d29yZHMpXG4gICAgICAgIHJldHVybiBlc2NhcGUobW9kZV9idWZmZXIpO1xuXG4gICAgICByZXN1bHQgPSAnJztcbiAgICAgIGxhc3RfaW5kZXggPSAwO1xuICAgICAgdG9wLmxleGVtZXNSZS5sYXN0SW5kZXggPSAwO1xuICAgICAgbWF0Y2ggPSB0b3AubGV4ZW1lc1JlLmV4ZWMobW9kZV9idWZmZXIpO1xuXG4gICAgICB3aGlsZSAobWF0Y2gpIHtcbiAgICAgICAgcmVzdWx0ICs9IGVzY2FwZShtb2RlX2J1ZmZlci5zdWJzdHJpbmcobGFzdF9pbmRleCwgbWF0Y2guaW5kZXgpKTtcbiAgICAgICAga2V5d29yZF9tYXRjaCA9IGtleXdvcmRNYXRjaCh0b3AsIG1hdGNoKTtcbiAgICAgICAgaWYgKGtleXdvcmRfbWF0Y2gpIHtcbiAgICAgICAgICByZWxldmFuY2UgKz0ga2V5d29yZF9tYXRjaFsxXTtcbiAgICAgICAgICByZXN1bHQgKz0gYnVpbGRTcGFuKGtleXdvcmRfbWF0Y2hbMF0sIGVzY2FwZShtYXRjaFswXSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdCArPSBlc2NhcGUobWF0Y2hbMF0pO1xuICAgICAgICB9XG4gICAgICAgIGxhc3RfaW5kZXggPSB0b3AubGV4ZW1lc1JlLmxhc3RJbmRleDtcbiAgICAgICAgbWF0Y2ggPSB0b3AubGV4ZW1lc1JlLmV4ZWMobW9kZV9idWZmZXIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdCArIGVzY2FwZShtb2RlX2J1ZmZlci5zdWJzdHIobGFzdF9pbmRleCkpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHByb2Nlc3NTdWJMYW5ndWFnZSgpIHtcbiAgICAgIHZhciBleHBsaWNpdCA9IHR5cGVvZiB0b3Auc3ViTGFuZ3VhZ2UgPT09ICdzdHJpbmcnO1xuICAgICAgaWYgKGV4cGxpY2l0ICYmICFsYW5ndWFnZXNbdG9wLnN1Ykxhbmd1YWdlXSkge1xuICAgICAgICByZXR1cm4gZXNjYXBlKG1vZGVfYnVmZmVyKTtcbiAgICAgIH1cblxuICAgICAgdmFyIHJlc3VsdCA9IGV4cGxpY2l0ID9cbiAgICAgICAgICAgICAgICAgICBoaWdobGlnaHQodG9wLnN1Ykxhbmd1YWdlLCBtb2RlX2J1ZmZlciwgdHJ1ZSwgY29udGludWF0aW9uc1t0b3Auc3ViTGFuZ3VhZ2VdKSA6XG4gICAgICAgICAgICAgICAgICAgaGlnaGxpZ2h0QXV0byhtb2RlX2J1ZmZlciwgdG9wLnN1Ykxhbmd1YWdlLmxlbmd0aCA/IHRvcC5zdWJMYW5ndWFnZSA6IHVuZGVmaW5lZCk7XG5cbiAgICAgIC8vIENvdW50aW5nIGVtYmVkZGVkIGxhbmd1YWdlIHNjb3JlIHRvd2FyZHMgdGhlIGhvc3QgbGFuZ3VhZ2UgbWF5IGJlIGRpc2FibGVkXG4gICAgICAvLyB3aXRoIHplcm9pbmcgdGhlIGNvbnRhaW5pbmcgbW9kZSByZWxldmFuY2UuIFVzZWNhc2UgaW4gcG9pbnQgaXMgTWFya2Rvd24gdGhhdFxuICAgICAgLy8gYWxsb3dzIFhNTCBldmVyeXdoZXJlIGFuZCBtYWtlcyBldmVyeSBYTUwgc25pcHBldCB0byBoYXZlIGEgbXVjaCBsYXJnZXIgTWFya2Rvd25cbiAgICAgIC8vIHNjb3JlLlxuICAgICAgaWYgKHRvcC5yZWxldmFuY2UgPiAwKSB7XG4gICAgICAgIHJlbGV2YW5jZSArPSByZXN1bHQucmVsZXZhbmNlO1xuICAgICAgfVxuICAgICAgaWYgKGV4cGxpY2l0KSB7XG4gICAgICAgIGNvbnRpbnVhdGlvbnNbdG9wLnN1Ykxhbmd1YWdlXSA9IHJlc3VsdC50b3A7XG4gICAgICB9XG4gICAgICByZXR1cm4gYnVpbGRTcGFuKHJlc3VsdC5sYW5ndWFnZSwgcmVzdWx0LnZhbHVlLCBmYWxzZSwgdHJ1ZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcHJvY2Vzc0J1ZmZlcigpIHtcbiAgICAgIHJlc3VsdCArPSAodG9wLnN1Ykxhbmd1YWdlICE9IG51bGwgPyBwcm9jZXNzU3ViTGFuZ3VhZ2UoKSA6IHByb2Nlc3NLZXl3b3JkcygpKTtcbiAgICAgIG1vZGVfYnVmZmVyID0gJyc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3RhcnROZXdNb2RlKG1vZGUpIHtcbiAgICAgIHJlc3VsdCArPSBtb2RlLmNsYXNzTmFtZT8gYnVpbGRTcGFuKG1vZGUuY2xhc3NOYW1lLCAnJywgdHJ1ZSk6ICcnO1xuICAgICAgdG9wID0gT2JqZWN0LmNyZWF0ZShtb2RlLCB7cGFyZW50OiB7dmFsdWU6IHRvcH19KTtcbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIGRvQmVnaW5NYXRjaChtYXRjaCkge1xuICAgICAgdmFyIGxleGVtZSA9IG1hdGNoWzBdO1xuICAgICAgdmFyIG5ld19tb2RlID0gbWF0Y2gucnVsZTtcblxuICAgICAgaWYgKG5ld19tb2RlICYmIG5ld19tb2RlLmVuZFNhbWVBc0JlZ2luKSB7XG4gICAgICAgIG5ld19tb2RlLmVuZFJlID0gZXNjYXBlUmUoIGxleGVtZSApO1xuICAgICAgfVxuXG4gICAgICBpZiAobmV3X21vZGUuc2tpcCkge1xuICAgICAgICBtb2RlX2J1ZmZlciArPSBsZXhlbWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAobmV3X21vZGUuZXhjbHVkZUJlZ2luKSB7XG4gICAgICAgICAgbW9kZV9idWZmZXIgKz0gbGV4ZW1lO1xuICAgICAgICB9XG4gICAgICAgIHByb2Nlc3NCdWZmZXIoKTtcbiAgICAgICAgaWYgKCFuZXdfbW9kZS5yZXR1cm5CZWdpbiAmJiAhbmV3X21vZGUuZXhjbHVkZUJlZ2luKSB7XG4gICAgICAgICAgbW9kZV9idWZmZXIgPSBsZXhlbWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHN0YXJ0TmV3TW9kZShuZXdfbW9kZSwgbGV4ZW1lKTtcbiAgICAgIHJldHVybiBuZXdfbW9kZS5yZXR1cm5CZWdpbiA/IDAgOiBsZXhlbWUubGVuZ3RoO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRvRW5kTWF0Y2gobWF0Y2gpIHtcbiAgICAgIHZhciBsZXhlbWUgPSBtYXRjaFswXTtcbiAgICAgIHZhciBlbmRfbW9kZSA9IGVuZE9mTW9kZSh0b3AsIGxleGVtZSk7XG4gICAgICBpZiAoIWVuZF9tb2RlKSB7IHJldHVybjsgfVxuXG4gICAgICB2YXIgb3JpZ2luID0gdG9wO1xuICAgICAgaWYgKG9yaWdpbi5za2lwKSB7XG4gICAgICAgIG1vZGVfYnVmZmVyICs9IGxleGVtZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICghKG9yaWdpbi5yZXR1cm5FbmQgfHwgb3JpZ2luLmV4Y2x1ZGVFbmQpKSB7XG4gICAgICAgICAgbW9kZV9idWZmZXIgKz0gbGV4ZW1lO1xuICAgICAgICB9XG4gICAgICAgIHByb2Nlc3NCdWZmZXIoKTtcbiAgICAgICAgaWYgKG9yaWdpbi5leGNsdWRlRW5kKSB7XG4gICAgICAgICAgbW9kZV9idWZmZXIgPSBsZXhlbWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGRvIHtcbiAgICAgICAgaWYgKHRvcC5jbGFzc05hbWUpIHtcbiAgICAgICAgICByZXN1bHQgKz0gc3BhbkVuZFRhZztcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRvcC5za2lwICYmICF0b3Auc3ViTGFuZ3VhZ2UpIHtcbiAgICAgICAgICByZWxldmFuY2UgKz0gdG9wLnJlbGV2YW5jZTtcbiAgICAgICAgfVxuICAgICAgICB0b3AgPSB0b3AucGFyZW50O1xuICAgICAgfSB3aGlsZSAodG9wICE9PSBlbmRfbW9kZS5wYXJlbnQpO1xuICAgICAgaWYgKGVuZF9tb2RlLnN0YXJ0cykge1xuICAgICAgICBpZiAoZW5kX21vZGUuZW5kU2FtZUFzQmVnaW4pIHtcbiAgICAgICAgICBlbmRfbW9kZS5zdGFydHMuZW5kUmUgPSBlbmRfbW9kZS5lbmRSZTtcbiAgICAgICAgfVxuICAgICAgICBzdGFydE5ld01vZGUoZW5kX21vZGUuc3RhcnRzLCAnJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gb3JpZ2luLnJldHVybkVuZCA/IDAgOiBsZXhlbWUubGVuZ3RoO1xuICAgIH1cblxuICAgIHZhciBsYXN0TWF0Y2ggPSB7fTtcbiAgICBmdW5jdGlvbiBwcm9jZXNzTGV4ZW1lKHRleHRfYmVmb3JlX21hdGNoLCBtYXRjaCkge1xuXG4gICAgICB2YXIgbGV4ZW1lID0gbWF0Y2ggJiYgbWF0Y2hbMF07XG5cbiAgICAgIC8vIGFkZCBub24tbWF0Y2hlZCB0ZXh0IHRvIHRoZSBjdXJyZW50IG1vZGUgYnVmZmVyXG4gICAgICBtb2RlX2J1ZmZlciArPSB0ZXh0X2JlZm9yZV9tYXRjaDtcblxuICAgICAgaWYgKGxleGVtZSA9PSBudWxsKSB7XG4gICAgICAgIHByb2Nlc3NCdWZmZXIoKTtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgICB9XG5cbiAgICAgIC8vIHdlJ3ZlIGZvdW5kIGEgMCB3aWR0aCBtYXRjaCBhbmQgd2UncmUgc3R1Y2ssIHNvIHdlIG5lZWQgdG8gYWR2YW5jZVxuICAgICAgLy8gdGhpcyBoYXBwZW5zIHdoZW4gd2UgaGF2ZSBiYWRseSBiZWhhdmVkIHJ1bGVzIHRoYXQgaGF2ZSBvcHRpb25hbCBtYXRjaGVycyB0byB0aGUgZGVncmVlIHRoYXRcbiAgICAgIC8vIHNvbWV0aW1lcyB0aGV5IGNhbiBlbmQgdXAgbWF0Y2hpbmcgbm90aGluZyBhdCBhbGxcbiAgICAgIC8vIFJlZjogaHR0cHM6Ly9naXRodWIuY29tL2hpZ2hsaWdodGpzL2hpZ2hsaWdodC5qcy9pc3N1ZXMvMjE0MFxuICAgICAgaWYgKGxhc3RNYXRjaC50eXBlPT1cImJlZ2luXCIgJiYgbWF0Y2gudHlwZT09XCJlbmRcIiAmJiBsYXN0TWF0Y2guaW5kZXggPT0gbWF0Y2guaW5kZXggJiYgbGV4ZW1lID09PSBcIlwiKSB7XG4gICAgICAgIC8vIHNwaXQgdGhlIFwic2tpcHBlZFwiIGNoYXJhY3RlciB0aGF0IG91ciByZWdleCBjaG9rZWQgb24gYmFjayBpbnRvIHRoZSBvdXRwdXQgc2VxdWVuY2VcbiAgICAgICAgbW9kZV9idWZmZXIgKz0gdmFsdWUuc2xpY2UobWF0Y2guaW5kZXgsIG1hdGNoLmluZGV4ICsgMSlcbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG4gICAgICBsYXN0TWF0Y2ggPSBtYXRjaDtcblxuICAgICAgaWYgKG1hdGNoLnR5cGU9PT1cImJlZ2luXCIpIHtcbiAgICAgICAgcmV0dXJuIGRvQmVnaW5NYXRjaChtYXRjaCk7XG4gICAgICB9IGVsc2UgaWYgKG1hdGNoLnR5cGU9PT1cImlsbGVnYWxcIiAmJiAhaWdub3JlX2lsbGVnYWxzKSB7XG4gICAgICAgIC8vIGlsbGVnYWwgbWF0Y2gsIHdlIGRvIG5vdCBjb250aW51ZSBwcm9jZXNzaW5nXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSWxsZWdhbCBsZXhlbWUgXCInICsgbGV4ZW1lICsgJ1wiIGZvciBtb2RlIFwiJyArICh0b3AuY2xhc3NOYW1lIHx8ICc8dW5uYW1lZD4nKSArICdcIicpO1xuICAgICAgfSBlbHNlIGlmIChtYXRjaC50eXBlPT09XCJlbmRcIikge1xuICAgICAgICB2YXIgcHJvY2Vzc2VkID0gZG9FbmRNYXRjaChtYXRjaCk7XG4gICAgICAgIGlmIChwcm9jZXNzZWQgIT0gdW5kZWZpbmVkKVxuICAgICAgICAgIHJldHVybiBwcm9jZXNzZWQ7XG4gICAgICB9XG5cbiAgICAgIC8qXG4gICAgICBXaHkgbWlnaHQgYmUgZmluZCBvdXJzZWx2ZXMgaGVyZT8gIE9ubHkgb25lIG9jY2FzaW9uIG5vdy4gIEFuIGVuZCBtYXRjaCB0aGF0IHdhc1xuICAgICAgdHJpZ2dlcmVkIGJ1dCBjb3VsZCBub3QgYmUgY29tcGxldGVkLiAgV2hlbiBtaWdodCB0aGlzIGhhcHBlbj8gIFdoZW4gYW4gYGVuZFNhbWVhc0JlZ2luYFxuICAgICAgcnVsZSBzZXRzIHRoZSBlbmQgcnVsZSB0byBhIHNwZWNpZmljIG1hdGNoLiAgU2luY2UgdGhlIG92ZXJhbGwgbW9kZSB0ZXJtaW5hdGlvbiBydWxlIHRoYXQnc1xuICAgICAgYmVpbmcgdXNlZCB0byBzY2FuIHRoZSB0ZXh0IGlzbid0IHJlY29tcGlsZWQgdGhhdCBtZWFucyB0aGF0IGFueSBtYXRjaCB0aGF0IExPT0tTIGxpa2VcbiAgICAgIHRoZSBlbmQgKGJ1dCBpcyBub3QsIGJlY2F1c2UgaXQgaXMgbm90IGFuIGV4YWN0IG1hdGNoIHRvIHRoZSBiZWdpbm5pbmcpIHdpbGxcbiAgICAgIGVuZCB1cCBoZXJlLiAgQSBkZWZpbml0ZSBlbmQgbWF0Y2gsIGJ1dCB3aGVuIGBkb0VuZE1hdGNoYCB0cmllcyB0byBcInJlYXBwbHlcIlxuICAgICAgdGhlIGVuZCBydWxlIGFuZCBmYWlscyB0byBtYXRjaCwgd2Ugd2luZCB1cCBoZXJlLCBhbmQganVzdCBzaWxlbnRseSBpZ25vcmUgdGhlIGVuZC5cblxuICAgICAgVGhpcyBjYXVzZXMgbm8gcmVhbCBoYXJtIG90aGVyIHRoYW4gc3RvcHBpbmcgYSBmZXcgdGltZXMgdG9vIG1hbnkuXG4gICAgICAqL1xuXG4gICAgICBtb2RlX2J1ZmZlciArPSBsZXhlbWU7XG4gICAgICByZXR1cm4gbGV4ZW1lLmxlbmd0aDtcbiAgICB9XG5cbiAgICB2YXIgbGFuZ3VhZ2UgPSBnZXRMYW5ndWFnZShuYW1lKTtcbiAgICBpZiAoIWxhbmd1YWdlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gbGFuZ3VhZ2U6IFwiJyArIG5hbWUgKyAnXCInKTtcbiAgICB9XG5cbiAgICBjb21waWxlTGFuZ3VhZ2UobGFuZ3VhZ2UpO1xuICAgIHZhciB0b3AgPSBjb250aW51YXRpb24gfHwgbGFuZ3VhZ2U7XG4gICAgdmFyIGNvbnRpbnVhdGlvbnMgPSB7fTsgLy8ga2VlcCBjb250aW51YXRpb25zIGZvciBzdWItbGFuZ3VhZ2VzXG4gICAgdmFyIHJlc3VsdCA9ICcnLCBjdXJyZW50O1xuICAgIGZvcihjdXJyZW50ID0gdG9wOyBjdXJyZW50ICE9PSBsYW5ndWFnZTsgY3VycmVudCA9IGN1cnJlbnQucGFyZW50KSB7XG4gICAgICBpZiAoY3VycmVudC5jbGFzc05hbWUpIHtcbiAgICAgICAgcmVzdWx0ID0gYnVpbGRTcGFuKGN1cnJlbnQuY2xhc3NOYW1lLCAnJywgdHJ1ZSkgKyByZXN1bHQ7XG4gICAgICB9XG4gICAgfVxuICAgIHZhciBtb2RlX2J1ZmZlciA9ICcnO1xuICAgIHZhciByZWxldmFuY2UgPSAwO1xuICAgIHRyeSB7XG4gICAgICB2YXIgbWF0Y2gsIGNvdW50LCBpbmRleCA9IDA7XG4gICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICB0b3AudGVybWluYXRvcnMubGFzdEluZGV4ID0gaW5kZXg7XG4gICAgICAgIG1hdGNoID0gdG9wLnRlcm1pbmF0b3JzLmV4ZWModmFsdWUpO1xuICAgICAgICBpZiAoIW1hdGNoKVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjb3VudCA9IHByb2Nlc3NMZXhlbWUodmFsdWUuc3Vic3RyaW5nKGluZGV4LCBtYXRjaC5pbmRleCksIG1hdGNoKTtcbiAgICAgICAgaW5kZXggPSBtYXRjaC5pbmRleCArIGNvdW50O1xuICAgICAgfVxuICAgICAgcHJvY2Vzc0xleGVtZSh2YWx1ZS5zdWJzdHIoaW5kZXgpKTtcbiAgICAgIGZvcihjdXJyZW50ID0gdG9wOyBjdXJyZW50LnBhcmVudDsgY3VycmVudCA9IGN1cnJlbnQucGFyZW50KSB7IC8vIGNsb3NlIGRhbmdsaW5nIG1vZGVzXG4gICAgICAgIGlmIChjdXJyZW50LmNsYXNzTmFtZSkge1xuICAgICAgICAgIHJlc3VsdCArPSBzcGFuRW5kVGFnO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4ge1xuICAgICAgICByZWxldmFuY2U6IHJlbGV2YW5jZSxcbiAgICAgICAgdmFsdWU6IHJlc3VsdCxcbiAgICAgICAgaWxsZWdhbDpmYWxzZSxcbiAgICAgICAgbGFuZ3VhZ2U6IG5hbWUsXG4gICAgICAgIHRvcDogdG9wXG4gICAgICB9O1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlLm1lc3NhZ2UgJiYgZS5tZXNzYWdlLmluZGV4T2YoJ0lsbGVnYWwnKSAhPT0gLTEpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBpbGxlZ2FsOiB0cnVlLFxuICAgICAgICAgIHJlbGV2YW5jZTogMCxcbiAgICAgICAgICB2YWx1ZTogZXNjYXBlKHZhbHVlKVxuICAgICAgICB9O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKlxuICBIaWdobGlnaHRpbmcgd2l0aCBsYW5ndWFnZSBkZXRlY3Rpb24uIEFjY2VwdHMgYSBzdHJpbmcgd2l0aCB0aGUgY29kZSB0b1xuICBoaWdobGlnaHQuIFJldHVybnMgYW4gb2JqZWN0IHdpdGggdGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzOlxuXG4gIC0gbGFuZ3VhZ2UgKGRldGVjdGVkIGxhbmd1YWdlKVxuICAtIHJlbGV2YW5jZSAoaW50KVxuICAtIHZhbHVlIChhbiBIVE1MIHN0cmluZyB3aXRoIGhpZ2hsaWdodGluZyBtYXJrdXApXG4gIC0gc2Vjb25kX2Jlc3QgKG9iamVjdCB3aXRoIHRoZSBzYW1lIHN0cnVjdHVyZSBmb3Igc2Vjb25kLWJlc3QgaGV1cmlzdGljYWxseVxuICAgIGRldGVjdGVkIGxhbmd1YWdlLCBtYXkgYmUgYWJzZW50KVxuXG4gICovXG4gIGZ1bmN0aW9uIGhpZ2hsaWdodEF1dG8odGV4dCwgbGFuZ3VhZ2VTdWJzZXQpIHtcbiAgICBsYW5ndWFnZVN1YnNldCA9IGxhbmd1YWdlU3Vic2V0IHx8IG9wdGlvbnMubGFuZ3VhZ2VzIHx8IG9iamVjdEtleXMobGFuZ3VhZ2VzKTtcbiAgICB2YXIgcmVzdWx0ID0ge1xuICAgICAgcmVsZXZhbmNlOiAwLFxuICAgICAgdmFsdWU6IGVzY2FwZSh0ZXh0KVxuICAgIH07XG4gICAgdmFyIHNlY29uZF9iZXN0ID0gcmVzdWx0O1xuICAgIGxhbmd1YWdlU3Vic2V0LmZpbHRlcihnZXRMYW5ndWFnZSkuZmlsdGVyKGF1dG9EZXRlY3Rpb24pLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgdmFyIGN1cnJlbnQgPSBoaWdobGlnaHQobmFtZSwgdGV4dCwgZmFsc2UpO1xuICAgICAgY3VycmVudC5sYW5ndWFnZSA9IG5hbWU7XG4gICAgICBpZiAoY3VycmVudC5yZWxldmFuY2UgPiBzZWNvbmRfYmVzdC5yZWxldmFuY2UpIHtcbiAgICAgICAgc2Vjb25kX2Jlc3QgPSBjdXJyZW50O1xuICAgICAgfVxuICAgICAgaWYgKGN1cnJlbnQucmVsZXZhbmNlID4gcmVzdWx0LnJlbGV2YW5jZSkge1xuICAgICAgICBzZWNvbmRfYmVzdCA9IHJlc3VsdDtcbiAgICAgICAgcmVzdWx0ID0gY3VycmVudDtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoc2Vjb25kX2Jlc3QubGFuZ3VhZ2UpIHtcbiAgICAgIHJlc3VsdC5zZWNvbmRfYmVzdCA9IHNlY29uZF9iZXN0O1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLypcbiAgUG9zdC1wcm9jZXNzaW5nIG9mIHRoZSBoaWdobGlnaHRlZCBtYXJrdXA6XG5cbiAgLSByZXBsYWNlIFRBQnMgd2l0aCBzb21ldGhpbmcgbW9yZSB1c2VmdWxcbiAgLSByZXBsYWNlIHJlYWwgbGluZS1icmVha3Mgd2l0aCAnPGJyPicgZm9yIG5vbi1wcmUgY29udGFpbmVyc1xuXG4gICovXG4gIGZ1bmN0aW9uIGZpeE1hcmt1cCh2YWx1ZSkge1xuICAgIHJldHVybiAhKG9wdGlvbnMudGFiUmVwbGFjZSB8fCBvcHRpb25zLnVzZUJSKVxuICAgICAgPyB2YWx1ZVxuICAgICAgOiB2YWx1ZS5yZXBsYWNlKGZpeE1hcmt1cFJlLCBmdW5jdGlvbihtYXRjaCwgcDEpIHtcbiAgICAgICAgICBpZiAob3B0aW9ucy51c2VCUiAmJiBtYXRjaCA9PT0gJ1xcbicpIHtcbiAgICAgICAgICAgIHJldHVybiAnPGJyPic7XG4gICAgICAgICAgfSBlbHNlIGlmIChvcHRpb25zLnRhYlJlcGxhY2UpIHtcbiAgICAgICAgICAgIHJldHVybiBwMS5yZXBsYWNlKC9cXHQvZywgb3B0aW9ucy50YWJSZXBsYWNlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBidWlsZENsYXNzTmFtZShwcmV2Q2xhc3NOYW1lLCBjdXJyZW50TGFuZywgcmVzdWx0TGFuZykge1xuICAgIHZhciBsYW5ndWFnZSA9IGN1cnJlbnRMYW5nID8gYWxpYXNlc1tjdXJyZW50TGFuZ10gOiByZXN1bHRMYW5nLFxuICAgICAgICByZXN1bHQgICA9IFtwcmV2Q2xhc3NOYW1lLnRyaW0oKV07XG5cbiAgICBpZiAoIXByZXZDbGFzc05hbWUubWF0Y2goL1xcYmhsanNcXGIvKSkge1xuICAgICAgcmVzdWx0LnB1c2goJ2hsanMnKTtcbiAgICB9XG5cbiAgICBpZiAocHJldkNsYXNzTmFtZS5pbmRleE9mKGxhbmd1YWdlKSA9PT0gLTEpIHtcbiAgICAgIHJlc3VsdC5wdXNoKGxhbmd1YWdlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0LmpvaW4oJyAnKS50cmltKCk7XG4gIH1cblxuICAvKlxuICBBcHBsaWVzIGhpZ2hsaWdodGluZyB0byBhIERPTSBub2RlIGNvbnRhaW5pbmcgY29kZS4gQWNjZXB0cyBhIERPTSBub2RlIGFuZFxuICB0d28gb3B0aW9uYWwgcGFyYW1ldGVycyBmb3IgZml4TWFya3VwLlxuICAqL1xuICBmdW5jdGlvbiBoaWdobGlnaHRCbG9jayhibG9jaykge1xuICAgIHZhciBub2RlLCBvcmlnaW5hbFN0cmVhbSwgcmVzdWx0LCByZXN1bHROb2RlLCB0ZXh0O1xuICAgIHZhciBsYW5ndWFnZSA9IGJsb2NrTGFuZ3VhZ2UoYmxvY2spO1xuXG4gICAgaWYgKGlzTm90SGlnaGxpZ2h0ZWQobGFuZ3VhZ2UpKVxuICAgICAgICByZXR1cm47XG5cbiAgICBpZiAob3B0aW9ucy51c2VCUikge1xuICAgICAgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUygnaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbCcsICdkaXYnKTtcbiAgICAgIG5vZGUuaW5uZXJIVE1MID0gYmxvY2suaW5uZXJIVE1MLnJlcGxhY2UoL1xcbi9nLCAnJykucmVwbGFjZSgvPGJyWyBcXC9dKj4vZywgJ1xcbicpO1xuICAgIH0gZWxzZSB7XG4gICAgICBub2RlID0gYmxvY2s7XG4gICAgfVxuICAgIHRleHQgPSBub2RlLnRleHRDb250ZW50O1xuICAgIHJlc3VsdCA9IGxhbmd1YWdlID8gaGlnaGxpZ2h0KGxhbmd1YWdlLCB0ZXh0LCB0cnVlKSA6IGhpZ2hsaWdodEF1dG8odGV4dCk7XG5cbiAgICBvcmlnaW5hbFN0cmVhbSA9IG5vZGVTdHJlYW0obm9kZSk7XG4gICAgaWYgKG9yaWdpbmFsU3RyZWFtLmxlbmd0aCkge1xuICAgICAgcmVzdWx0Tm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUygnaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbCcsICdkaXYnKTtcbiAgICAgIHJlc3VsdE5vZGUuaW5uZXJIVE1MID0gcmVzdWx0LnZhbHVlO1xuICAgICAgcmVzdWx0LnZhbHVlID0gbWVyZ2VTdHJlYW1zKG9yaWdpbmFsU3RyZWFtLCBub2RlU3RyZWFtKHJlc3VsdE5vZGUpLCB0ZXh0KTtcbiAgICB9XG4gICAgcmVzdWx0LnZhbHVlID0gZml4TWFya3VwKHJlc3VsdC52YWx1ZSk7XG5cbiAgICBibG9jay5pbm5lckhUTUwgPSByZXN1bHQudmFsdWU7XG4gICAgYmxvY2suY2xhc3NOYW1lID0gYnVpbGRDbGFzc05hbWUoYmxvY2suY2xhc3NOYW1lLCBsYW5ndWFnZSwgcmVzdWx0Lmxhbmd1YWdlKTtcbiAgICBibG9jay5yZXN1bHQgPSB7XG4gICAgICBsYW5ndWFnZTogcmVzdWx0Lmxhbmd1YWdlLFxuICAgICAgcmU6IHJlc3VsdC5yZWxldmFuY2VcbiAgICB9O1xuICAgIGlmIChyZXN1bHQuc2Vjb25kX2Jlc3QpIHtcbiAgICAgIGJsb2NrLnNlY29uZF9iZXN0ID0ge1xuICAgICAgICBsYW5ndWFnZTogcmVzdWx0LnNlY29uZF9iZXN0Lmxhbmd1YWdlLFxuICAgICAgICByZTogcmVzdWx0LnNlY29uZF9iZXN0LnJlbGV2YW5jZVxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICAvKlxuICBVcGRhdGVzIGhpZ2hsaWdodC5qcyBnbG9iYWwgb3B0aW9ucyB3aXRoIHZhbHVlcyBwYXNzZWQgaW4gdGhlIGZvcm0gb2YgYW4gb2JqZWN0LlxuICAqL1xuICBmdW5jdGlvbiBjb25maWd1cmUodXNlcl9vcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IGluaGVyaXQob3B0aW9ucywgdXNlcl9vcHRpb25zKTtcbiAgfVxuXG4gIC8qXG4gIEFwcGxpZXMgaGlnaGxpZ2h0aW5nIHRvIGFsbCA8cHJlPjxjb2RlPi4uPC9jb2RlPjwvcHJlPiBibG9ja3Mgb24gYSBwYWdlLlxuICAqL1xuICBmdW5jdGlvbiBpbml0SGlnaGxpZ2h0aW5nKCkge1xuICAgIGlmIChpbml0SGlnaGxpZ2h0aW5nLmNhbGxlZClcbiAgICAgIHJldHVybjtcbiAgICBpbml0SGlnaGxpZ2h0aW5nLmNhbGxlZCA9IHRydWU7XG5cbiAgICB2YXIgYmxvY2tzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgncHJlIGNvZGUnKTtcbiAgICBBcnJheVByb3RvLmZvckVhY2guY2FsbChibG9ja3MsIGhpZ2hsaWdodEJsb2NrKTtcbiAgfVxuXG4gIC8qXG4gIEF0dGFjaGVzIGhpZ2hsaWdodGluZyB0byB0aGUgcGFnZSBsb2FkIGV2ZW50LlxuICAqL1xuICBmdW5jdGlvbiBpbml0SGlnaGxpZ2h0aW5nT25Mb2FkKCkge1xuICAgIGFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCBpbml0SGlnaGxpZ2h0aW5nLCBmYWxzZSk7XG4gICAgYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIGluaXRIaWdobGlnaHRpbmcsIGZhbHNlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlZ2lzdGVyTGFuZ3VhZ2UobmFtZSwgbGFuZ3VhZ2UpIHtcbiAgICB2YXIgbGFuZyA9IGxhbmd1YWdlc1tuYW1lXSA9IGxhbmd1YWdlKGhsanMpO1xuICAgIHJlc3RvcmVMYW5ndWFnZUFwaShsYW5nKTtcbiAgICBsYW5nLnJhd0RlZmluaXRpb24gPSBsYW5ndWFnZS5iaW5kKG51bGwsaGxqcyk7XG5cbiAgICBpZiAobGFuZy5hbGlhc2VzKSB7XG4gICAgICBsYW5nLmFsaWFzZXMuZm9yRWFjaChmdW5jdGlvbihhbGlhcykge2FsaWFzZXNbYWxpYXNdID0gbmFtZTt9KTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBsaXN0TGFuZ3VhZ2VzKCkge1xuICAgIHJldHVybiBvYmplY3RLZXlzKGxhbmd1YWdlcyk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRMYW5ndWFnZShuYW1lKSB7XG4gICAgbmFtZSA9IChuYW1lIHx8ICcnKS50b0xvd2VyQ2FzZSgpO1xuICAgIHJldHVybiBsYW5ndWFnZXNbbmFtZV0gfHwgbGFuZ3VhZ2VzW2FsaWFzZXNbbmFtZV1dO1xuICB9XG5cbiAgZnVuY3Rpb24gYXV0b0RldGVjdGlvbihuYW1lKSB7XG4gICAgdmFyIGxhbmcgPSBnZXRMYW5ndWFnZShuYW1lKTtcbiAgICByZXR1cm4gbGFuZyAmJiAhbGFuZy5kaXNhYmxlQXV0b2RldGVjdDtcbiAgfVxuXG4gIC8qIEludGVyZmFjZSBkZWZpbml0aW9uICovXG5cbiAgaGxqcy5oaWdobGlnaHQgPSBoaWdobGlnaHQ7XG4gIGhsanMuaGlnaGxpZ2h0QXV0byA9IGhpZ2hsaWdodEF1dG87XG4gIGhsanMuZml4TWFya3VwID0gZml4TWFya3VwO1xuICBobGpzLmhpZ2hsaWdodEJsb2NrID0gaGlnaGxpZ2h0QmxvY2s7XG4gIGhsanMuY29uZmlndXJlID0gY29uZmlndXJlO1xuICBobGpzLmluaXRIaWdobGlnaHRpbmcgPSBpbml0SGlnaGxpZ2h0aW5nO1xuICBobGpzLmluaXRIaWdobGlnaHRpbmdPbkxvYWQgPSBpbml0SGlnaGxpZ2h0aW5nT25Mb2FkO1xuICBobGpzLnJlZ2lzdGVyTGFuZ3VhZ2UgPSByZWdpc3Rlckxhbmd1YWdlO1xuICBobGpzLmxpc3RMYW5ndWFnZXMgPSBsaXN0TGFuZ3VhZ2VzO1xuICBobGpzLmdldExhbmd1YWdlID0gZ2V0TGFuZ3VhZ2U7XG4gIGhsanMuYXV0b0RldGVjdGlvbiA9IGF1dG9EZXRlY3Rpb247XG4gIGhsanMuaW5oZXJpdCA9IGluaGVyaXQ7XG5cbiAgLy8gQ29tbW9uIHJlZ2V4cHNcbiAgaGxqcy5JREVOVF9SRSA9ICdbYS16QS1aXVxcXFx3Kic7XG4gIGhsanMuVU5ERVJTQ09SRV9JREVOVF9SRSA9ICdbYS16QS1aX11cXFxcdyonO1xuICBobGpzLk5VTUJFUl9SRSA9ICdcXFxcYlxcXFxkKyhcXFxcLlxcXFxkKyk/JztcbiAgaGxqcy5DX05VTUJFUl9SRSA9ICcoLT8pKFxcXFxiMFt4WF1bYS1mQS1GMC05XSt8KFxcXFxiXFxcXGQrKFxcXFwuXFxcXGQqKT98XFxcXC5cXFxcZCspKFtlRV1bLStdP1xcXFxkKyk/KSc7IC8vIDB4Li4uLCAwLi4uLCBkZWNpbWFsLCBmbG9hdFxuICBobGpzLkJJTkFSWV9OVU1CRVJfUkUgPSAnXFxcXGIoMGJbMDFdKyknOyAvLyAwYi4uLlxuICBobGpzLlJFX1NUQVJURVJTX1JFID0gJyF8IT18IT09fCV8JT18JnwmJnwmPXxcXFxcKnxcXFxcKj18XFxcXCt8XFxcXCs9fCx8LXwtPXwvPXwvfDp8O3w8PHw8PD18PD18PHw9PT18PT18PXw+Pj49fD4+PXw+PXw+Pj58Pj58PnxcXFxcP3xcXFxcW3xcXFxce3xcXFxcKHxcXFxcXnxcXFxcXj18XFxcXHx8XFxcXHw9fFxcXFx8XFxcXHx8fic7XG5cbiAgLy8gQ29tbW9uIG1vZGVzXG4gIGhsanMuQkFDS1NMQVNIX0VTQ0FQRSA9IHtcbiAgICBiZWdpbjogJ1xcXFxcXFxcW1xcXFxzXFxcXFNdJywgcmVsZXZhbmNlOiAwXG4gIH07XG4gIGhsanMuQVBPU19TVFJJTkdfTU9ERSA9IHtcbiAgICBjbGFzc05hbWU6ICdzdHJpbmcnLFxuICAgIGJlZ2luOiAnXFwnJywgZW5kOiAnXFwnJyxcbiAgICBpbGxlZ2FsOiAnXFxcXG4nLFxuICAgIGNvbnRhaW5zOiBbaGxqcy5CQUNLU0xBU0hfRVNDQVBFXVxuICB9O1xuICBobGpzLlFVT1RFX1NUUklOR19NT0RFID0ge1xuICAgIGNsYXNzTmFtZTogJ3N0cmluZycsXG4gICAgYmVnaW46ICdcIicsIGVuZDogJ1wiJyxcbiAgICBpbGxlZ2FsOiAnXFxcXG4nLFxuICAgIGNvbnRhaW5zOiBbaGxqcy5CQUNLU0xBU0hfRVNDQVBFXVxuICB9O1xuICBobGpzLlBIUkFTQUxfV09SRFNfTU9ERSA9IHtcbiAgICBiZWdpbjogL1xcYihhfGFufHRoZXxhcmV8SSdtfGlzbid0fGRvbid0fGRvZXNuJ3R8d29uJ3R8YnV0fGp1c3R8c2hvdWxkfHByZXR0eXxzaW1wbHl8ZW5vdWdofGdvbm5hfGdvaW5nfHd0Znxzb3xzdWNofHdpbGx8eW91fHlvdXJ8dGhleXxsaWtlfG1vcmUpXFxiL1xuICB9O1xuICBobGpzLkNPTU1FTlQgPSBmdW5jdGlvbiAoYmVnaW4sIGVuZCwgaW5oZXJpdHMpIHtcbiAgICB2YXIgbW9kZSA9IGhsanMuaW5oZXJpdChcbiAgICAgIHtcbiAgICAgICAgY2xhc3NOYW1lOiAnY29tbWVudCcsXG4gICAgICAgIGJlZ2luOiBiZWdpbiwgZW5kOiBlbmQsXG4gICAgICAgIGNvbnRhaW5zOiBbXVxuICAgICAgfSxcbiAgICAgIGluaGVyaXRzIHx8IHt9XG4gICAgKTtcbiAgICBtb2RlLmNvbnRhaW5zLnB1c2goaGxqcy5QSFJBU0FMX1dPUkRTX01PREUpO1xuICAgIG1vZGUuY29udGFpbnMucHVzaCh7XG4gICAgICBjbGFzc05hbWU6ICdkb2N0YWcnLFxuICAgICAgYmVnaW46ICcoPzpUT0RPfEZJWE1FfE5PVEV8QlVHfFhYWCk6JyxcbiAgICAgIHJlbGV2YW5jZTogMFxuICAgIH0pO1xuICAgIHJldHVybiBtb2RlO1xuICB9O1xuICBobGpzLkNfTElORV9DT01NRU5UX01PREUgPSBobGpzLkNPTU1FTlQoJy8vJywgJyQnKTtcbiAgaGxqcy5DX0JMT0NLX0NPTU1FTlRfTU9ERSA9IGhsanMuQ09NTUVOVCgnL1xcXFwqJywgJ1xcXFwqLycpO1xuICBobGpzLkhBU0hfQ09NTUVOVF9NT0RFID0gaGxqcy5DT01NRU5UKCcjJywgJyQnKTtcbiAgaGxqcy5OVU1CRVJfTU9ERSA9IHtcbiAgICBjbGFzc05hbWU6ICdudW1iZXInLFxuICAgIGJlZ2luOiBobGpzLk5VTUJFUl9SRSxcbiAgICByZWxldmFuY2U6IDBcbiAgfTtcbiAgaGxqcy5DX05VTUJFUl9NT0RFID0ge1xuICAgIGNsYXNzTmFtZTogJ251bWJlcicsXG4gICAgYmVnaW46IGhsanMuQ19OVU1CRVJfUkUsXG4gICAgcmVsZXZhbmNlOiAwXG4gIH07XG4gIGhsanMuQklOQVJZX05VTUJFUl9NT0RFID0ge1xuICAgIGNsYXNzTmFtZTogJ251bWJlcicsXG4gICAgYmVnaW46IGhsanMuQklOQVJZX05VTUJFUl9SRSxcbiAgICByZWxldmFuY2U6IDBcbiAgfTtcbiAgaGxqcy5DU1NfTlVNQkVSX01PREUgPSB7XG4gICAgY2xhc3NOYW1lOiAnbnVtYmVyJyxcbiAgICBiZWdpbjogaGxqcy5OVU1CRVJfUkUgKyAnKCcgK1xuICAgICAgJyV8ZW18ZXh8Y2h8cmVtJyAgK1xuICAgICAgJ3x2d3x2aHx2bWlufHZtYXgnICtcbiAgICAgICd8Y218bW18aW58cHR8cGN8cHgnICtcbiAgICAgICd8ZGVnfGdyYWR8cmFkfHR1cm4nICtcbiAgICAgICd8c3xtcycgK1xuICAgICAgJ3xIenxrSHonICtcbiAgICAgICd8ZHBpfGRwY218ZHBweCcgK1xuICAgICAgJyk/JyxcbiAgICByZWxldmFuY2U6IDBcbiAgfTtcbiAgaGxqcy5SRUdFWFBfTU9ERSA9IHtcbiAgICBjbGFzc05hbWU6ICdyZWdleHAnLFxuICAgIGJlZ2luOiAvXFwvLywgZW5kOiAvXFwvW2dpbXV5XSovLFxuICAgIGlsbGVnYWw6IC9cXG4vLFxuICAgIGNvbnRhaW5zOiBbXG4gICAgICBobGpzLkJBQ0tTTEFTSF9FU0NBUEUsXG4gICAgICB7XG4gICAgICAgIGJlZ2luOiAvXFxbLywgZW5kOiAvXFxdLyxcbiAgICAgICAgcmVsZXZhbmNlOiAwLFxuICAgICAgICBjb250YWluczogW2hsanMuQkFDS1NMQVNIX0VTQ0FQRV1cbiAgICAgIH1cbiAgICBdXG4gIH07XG4gIGhsanMuVElUTEVfTU9ERSA9IHtcbiAgICBjbGFzc05hbWU6ICd0aXRsZScsXG4gICAgYmVnaW46IGhsanMuSURFTlRfUkUsXG4gICAgcmVsZXZhbmNlOiAwXG4gIH07XG4gIGhsanMuVU5ERVJTQ09SRV9USVRMRV9NT0RFID0ge1xuICAgIGNsYXNzTmFtZTogJ3RpdGxlJyxcbiAgICBiZWdpbjogaGxqcy5VTkRFUlNDT1JFX0lERU5UX1JFLFxuICAgIHJlbGV2YW5jZTogMFxuICB9O1xuICBobGpzLk1FVEhPRF9HVUFSRCA9IHtcbiAgICAvLyBleGNsdWRlcyBtZXRob2QgbmFtZXMgZnJvbSBrZXl3b3JkIHByb2Nlc3NpbmdcbiAgICBiZWdpbjogJ1xcXFwuXFxcXHMqJyArIGhsanMuVU5ERVJTQ09SRV9JREVOVF9SRSxcbiAgICByZWxldmFuY2U6IDBcbiAgfTtcblxuICByZXR1cm4gaGxqcztcbn0pKTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oaGxqcykge1xuICB2YXIgSURFTlRfUkUgPSAnW0EtWmEteiRfXVswLTlBLVphLXokX10qJztcbiAgdmFyIEtFWVdPUkRTID0ge1xuICAgIGtleXdvcmQ6XG4gICAgICAnaW4gb2YgaWYgZm9yIHdoaWxlIGZpbmFsbHkgdmFyIG5ldyBmdW5jdGlvbiBkbyByZXR1cm4gdm9pZCBlbHNlIGJyZWFrIGNhdGNoICcgK1xuICAgICAgJ2luc3RhbmNlb2Ygd2l0aCB0aHJvdyBjYXNlIGRlZmF1bHQgdHJ5IHRoaXMgc3dpdGNoIGNvbnRpbnVlIHR5cGVvZiBkZWxldGUgJyArXG4gICAgICAnbGV0IHlpZWxkIGNvbnN0IGV4cG9ydCBzdXBlciBkZWJ1Z2dlciBhcyBhc3luYyBhd2FpdCBzdGF0aWMgJyArXG4gICAgICAvLyBFQ01BU2NyaXB0IDYgbW9kdWxlcyBpbXBvcnRcbiAgICAgICdpbXBvcnQgZnJvbSBhcydcbiAgICAsXG4gICAgbGl0ZXJhbDpcbiAgICAgICd0cnVlIGZhbHNlIG51bGwgdW5kZWZpbmVkIE5hTiBJbmZpbml0eScsXG4gICAgYnVpbHRfaW46XG4gICAgICAnZXZhbCBpc0Zpbml0ZSBpc05hTiBwYXJzZUZsb2F0IHBhcnNlSW50IGRlY29kZVVSSSBkZWNvZGVVUklDb21wb25lbnQgJyArXG4gICAgICAnZW5jb2RlVVJJIGVuY29kZVVSSUNvbXBvbmVudCBlc2NhcGUgdW5lc2NhcGUgT2JqZWN0IEZ1bmN0aW9uIEJvb2xlYW4gRXJyb3IgJyArXG4gICAgICAnRXZhbEVycm9yIEludGVybmFsRXJyb3IgUmFuZ2VFcnJvciBSZWZlcmVuY2VFcnJvciBTdG9wSXRlcmF0aW9uIFN5bnRheEVycm9yICcgK1xuICAgICAgJ1R5cGVFcnJvciBVUklFcnJvciBOdW1iZXIgTWF0aCBEYXRlIFN0cmluZyBSZWdFeHAgQXJyYXkgRmxvYXQzMkFycmF5ICcgK1xuICAgICAgJ0Zsb2F0NjRBcnJheSBJbnQxNkFycmF5IEludDMyQXJyYXkgSW50OEFycmF5IFVpbnQxNkFycmF5IFVpbnQzMkFycmF5ICcgK1xuICAgICAgJ1VpbnQ4QXJyYXkgVWludDhDbGFtcGVkQXJyYXkgQXJyYXlCdWZmZXIgRGF0YVZpZXcgSlNPTiBJbnRsIGFyZ3VtZW50cyByZXF1aXJlICcgK1xuICAgICAgJ21vZHVsZSBjb25zb2xlIHdpbmRvdyBkb2N1bWVudCBTeW1ib2wgU2V0IE1hcCBXZWFrU2V0IFdlYWtNYXAgUHJveHkgUmVmbGVjdCAnICtcbiAgICAgICdQcm9taXNlJ1xuICB9O1xuICB2YXIgTlVNQkVSID0ge1xuICAgIGNsYXNzTmFtZTogJ251bWJlcicsXG4gICAgdmFyaWFudHM6IFtcbiAgICAgIHsgYmVnaW46ICdcXFxcYigwW2JCXVswMV0rKW4/JyB9LFxuICAgICAgeyBiZWdpbjogJ1xcXFxiKDBbb09dWzAtN10rKW4/JyB9LFxuICAgICAgeyBiZWdpbjogaGxqcy5DX05VTUJFUl9SRSArICduPycgfVxuICAgIF0sXG4gICAgcmVsZXZhbmNlOiAwXG4gIH07XG4gIHZhciBTVUJTVCA9IHtcbiAgICBjbGFzc05hbWU6ICdzdWJzdCcsXG4gICAgYmVnaW46ICdcXFxcJFxcXFx7JywgZW5kOiAnXFxcXH0nLFxuICAgIGtleXdvcmRzOiBLRVlXT1JEUyxcbiAgICBjb250YWluczogW10gIC8vIGRlZmluZWQgbGF0ZXJcbiAgfTtcbiAgdmFyIEhUTUxfVEVNUExBVEUgPSB7XG4gICAgYmVnaW46ICdodG1sYCcsIGVuZDogJycsXG4gICAgc3RhcnRzOiB7XG4gICAgICBlbmQ6ICdgJywgcmV0dXJuRW5kOiBmYWxzZSxcbiAgICAgIGNvbnRhaW5zOiBbXG4gICAgICAgIGhsanMuQkFDS1NMQVNIX0VTQ0FQRSxcbiAgICAgICAgU1VCU1RcbiAgICAgIF0sXG4gICAgICBzdWJMYW5ndWFnZTogJ3htbCcsXG4gICAgfVxuICB9O1xuICB2YXIgQ1NTX1RFTVBMQVRFID0ge1xuICAgIGJlZ2luOiAnY3NzYCcsIGVuZDogJycsXG4gICAgc3RhcnRzOiB7XG4gICAgICBlbmQ6ICdgJywgcmV0dXJuRW5kOiBmYWxzZSxcbiAgICAgIGNvbnRhaW5zOiBbXG4gICAgICAgIGhsanMuQkFDS1NMQVNIX0VTQ0FQRSxcbiAgICAgICAgU1VCU1RcbiAgICAgIF0sXG4gICAgICBzdWJMYW5ndWFnZTogJ2NzcycsXG4gICAgfVxuICB9O1xuICB2YXIgVEVNUExBVEVfU1RSSU5HID0ge1xuICAgIGNsYXNzTmFtZTogJ3N0cmluZycsXG4gICAgYmVnaW46ICdgJywgZW5kOiAnYCcsXG4gICAgY29udGFpbnM6IFtcbiAgICAgIGhsanMuQkFDS1NMQVNIX0VTQ0FQRSxcbiAgICAgIFNVQlNUXG4gICAgXVxuICB9O1xuICBTVUJTVC5jb250YWlucyA9IFtcbiAgICBobGpzLkFQT1NfU1RSSU5HX01PREUsXG4gICAgaGxqcy5RVU9URV9TVFJJTkdfTU9ERSxcbiAgICBIVE1MX1RFTVBMQVRFLFxuICAgIENTU19URU1QTEFURSxcbiAgICBURU1QTEFURV9TVFJJTkcsXG4gICAgTlVNQkVSLFxuICAgIGhsanMuUkVHRVhQX01PREVcbiAgXTtcbiAgdmFyIFBBUkFNU19DT05UQUlOUyA9IFNVQlNULmNvbnRhaW5zLmNvbmNhdChbXG4gICAgaGxqcy5DX0JMT0NLX0NPTU1FTlRfTU9ERSxcbiAgICBobGpzLkNfTElORV9DT01NRU5UX01PREVcbiAgXSk7XG5cbiAgcmV0dXJuIHtcbiAgICBhbGlhc2VzOiBbJ2pzJywgJ2pzeCddLFxuICAgIGtleXdvcmRzOiBLRVlXT1JEUyxcbiAgICBjb250YWluczogW1xuICAgICAge1xuICAgICAgICBjbGFzc05hbWU6ICdtZXRhJyxcbiAgICAgICAgcmVsZXZhbmNlOiAxMCxcbiAgICAgICAgYmVnaW46IC9eXFxzKlsnXCJddXNlIChzdHJpY3R8YXNtKVsnXCJdL1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgY2xhc3NOYW1lOiAnbWV0YScsXG4gICAgICAgIGJlZ2luOiAvXiMhLywgZW5kOiAvJC9cbiAgICAgIH0sXG4gICAgICBobGpzLkFQT1NfU1RSSU5HX01PREUsXG4gICAgICBobGpzLlFVT1RFX1NUUklOR19NT0RFLFxuICAgICAgSFRNTF9URU1QTEFURSxcbiAgICAgIENTU19URU1QTEFURSxcbiAgICAgIFRFTVBMQVRFX1NUUklORyxcbiAgICAgIGhsanMuQ19MSU5FX0NPTU1FTlRfTU9ERSxcbiAgICAgIGhsanMuQ19CTE9DS19DT01NRU5UX01PREUsXG4gICAgICBOVU1CRVIsXG4gICAgICB7IC8vIG9iamVjdCBhdHRyIGNvbnRhaW5lclxuICAgICAgICBiZWdpbjogL1t7LFxcbl1cXHMqLywgcmVsZXZhbmNlOiAwLFxuICAgICAgICBjb250YWluczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGJlZ2luOiBJREVOVF9SRSArICdcXFxccyo6JywgcmV0dXJuQmVnaW46IHRydWUsXG4gICAgICAgICAgICByZWxldmFuY2U6IDAsXG4gICAgICAgICAgICBjb250YWluczogW3tjbGFzc05hbWU6ICdhdHRyJywgYmVnaW46IElERU5UX1JFLCByZWxldmFuY2U6IDB9XVxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfSxcbiAgICAgIHsgLy8gXCJ2YWx1ZVwiIGNvbnRhaW5lclxuICAgICAgICBiZWdpbjogJygnICsgaGxqcy5SRV9TVEFSVEVSU19SRSArICd8XFxcXGIoY2FzZXxyZXR1cm58dGhyb3cpXFxcXGIpXFxcXHMqJyxcbiAgICAgICAga2V5d29yZHM6ICdyZXR1cm4gdGhyb3cgY2FzZScsXG4gICAgICAgIGNvbnRhaW5zOiBbXG4gICAgICAgICAgaGxqcy5DX0xJTkVfQ09NTUVOVF9NT0RFLFxuICAgICAgICAgIGhsanMuQ19CTE9DS19DT01NRU5UX01PREUsXG4gICAgICAgICAgaGxqcy5SRUdFWFBfTU9ERSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBjbGFzc05hbWU6ICdmdW5jdGlvbicsXG4gICAgICAgICAgICBiZWdpbjogJyhcXFxcKC4qP1xcXFwpfCcgKyBJREVOVF9SRSArICcpXFxcXHMqPT4nLCByZXR1cm5CZWdpbjogdHJ1ZSxcbiAgICAgICAgICAgIGVuZDogJ1xcXFxzKj0+JyxcbiAgICAgICAgICAgIGNvbnRhaW5zOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBjbGFzc05hbWU6ICdwYXJhbXMnLFxuICAgICAgICAgICAgICAgIHZhcmlhbnRzOiBbXG4gICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGJlZ2luOiBJREVOVF9SRVxuICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgYmVnaW46IC9cXChcXHMqXFwpLyxcbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGJlZ2luOiAvXFwoLywgZW5kOiAvXFwpLyxcbiAgICAgICAgICAgICAgICAgICAgZXhjbHVkZUJlZ2luOiB0cnVlLCBleGNsdWRlRW5kOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBrZXl3b3JkczogS0VZV09SRFMsXG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5zOiBQQVJBTVNfQ09OVEFJTlNcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGNsYXNzTmFtZTogJycsXG4gICAgICAgICAgICBiZWdpbjogL1xccy8sXG4gICAgICAgICAgICBlbmQ6IC9cXHMqLyxcbiAgICAgICAgICAgIHNraXA6IHRydWUsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7IC8vIEU0WCAvIEpTWFxuICAgICAgICAgICAgYmVnaW46IC88LywgZW5kOiAvKFxcL1tBLVphLXowLTlcXFxcLl86LV0rfFtBLVphLXowLTlcXFxcLl86LV0rXFwvKT4vLFxuICAgICAgICAgICAgc3ViTGFuZ3VhZ2U6ICd4bWwnLFxuICAgICAgICAgICAgY29udGFpbnM6IFtcbiAgICAgICAgICAgICAgeyBiZWdpbjogLzxbQS1aYS16MC05XFxcXC5fOi1dK1xccypcXC8+Lywgc2tpcDogdHJ1ZSB9LFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgYmVnaW46IC88W0EtWmEtejAtOVxcXFwuXzotXSsvLCBlbmQ6IC8oXFwvW0EtWmEtejAtOVxcXFwuXzotXSt8W0EtWmEtejAtOVxcXFwuXzotXStcXC8pPi8sIHNraXA6IHRydWUsXG4gICAgICAgICAgICAgICAgY29udGFpbnM6IFtcbiAgICAgICAgICAgICAgICAgIHsgYmVnaW46IC88W0EtWmEtejAtOVxcXFwuXzotXStcXHMqXFwvPi8sIHNraXA6IHRydWUgfSxcbiAgICAgICAgICAgICAgICAgICdzZWxmJ1xuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgXSxcbiAgICAgICAgcmVsZXZhbmNlOiAwXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBjbGFzc05hbWU6ICdmdW5jdGlvbicsXG4gICAgICAgIGJlZ2luS2V5d29yZHM6ICdmdW5jdGlvbicsIGVuZDogL1xcey8sIGV4Y2x1ZGVFbmQ6IHRydWUsXG4gICAgICAgIGNvbnRhaW5zOiBbXG4gICAgICAgICAgaGxqcy5pbmhlcml0KGhsanMuVElUTEVfTU9ERSwge2JlZ2luOiBJREVOVF9SRX0pLFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGNsYXNzTmFtZTogJ3BhcmFtcycsXG4gICAgICAgICAgICBiZWdpbjogL1xcKC8sIGVuZDogL1xcKS8sXG4gICAgICAgICAgICBleGNsdWRlQmVnaW46IHRydWUsXG4gICAgICAgICAgICBleGNsdWRlRW5kOiB0cnVlLFxuICAgICAgICAgICAgY29udGFpbnM6IFBBUkFNU19DT05UQUlOU1xuICAgICAgICAgIH1cbiAgICAgICAgXSxcbiAgICAgICAgaWxsZWdhbDogL1xcW3wlL1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgYmVnaW46IC9cXCRbKC5dLyAvLyByZWxldmFuY2UgYm9vc3RlciBmb3IgYSBwYXR0ZXJuIGNvbW1vbiB0byBKUyBsaWJzOiBgJChzb21ldGhpbmcpYCBhbmQgYCQuc29tZXRoaW5nYFxuICAgICAgfSxcbiAgICAgIGhsanMuTUVUSE9EX0dVQVJELFxuICAgICAgeyAvLyBFUzYgY2xhc3NcbiAgICAgICAgY2xhc3NOYW1lOiAnY2xhc3MnLFxuICAgICAgICBiZWdpbktleXdvcmRzOiAnY2xhc3MnLCBlbmQ6IC9bezs9XS8sIGV4Y2x1ZGVFbmQ6IHRydWUsXG4gICAgICAgIGlsbGVnYWw6IC9bOlwiXFxbXFxdXS8sXG4gICAgICAgIGNvbnRhaW5zOiBbXG4gICAgICAgICAge2JlZ2luS2V5d29yZHM6ICdleHRlbmRzJ30sXG4gICAgICAgICAgaGxqcy5VTkRFUlNDT1JFX1RJVExFX01PREVcbiAgICAgICAgXVxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgYmVnaW5LZXl3b3JkczogJ2NvbnN0cnVjdG9yIGdldCBzZXQnLCBlbmQ6IC9cXHsvLCBleGNsdWRlRW5kOiB0cnVlXG4gICAgICB9XG4gICAgXSxcbiAgICBpbGxlZ2FsOiAvIyg/ISEpL1xuICB9O1xufTsiLCIvLyBZb3UgY2FuIHdyaXRlIGEgY2FsbCBhbmQgaW1wb3J0IHlvdXIgZnVuY3Rpb25zIGluIHRoaXMgZmlsZS5cbi8vXG4vLyBUaGlzIGZpbGUgd2lsbCBiZSBjb21waWxlZCBpbnRvIGFwcC5qcyBhbmQgd2lsbCBub3QgYmUgbWluaWZpZWQuXG4vLyBGZWVsIGZyZWUgd2l0aCB1c2luZyBFUzYgaGVyZS5cblxuLy8gaW1wb3J0IHtOQU1FfSBmcm9tICcuL21vZHVsZXMvLi4uJztcbmltcG9ydCBobGpzIGZyb20gJ2hpZ2hsaWdodC5qcy9saWIvaGlnaGxpZ2h0JztcbmltcG9ydCBqYXZhc2NyaXB0IGZyb20gJ2hpZ2hsaWdodC5qcy9saWIvbGFuZ3VhZ2VzL2phdmFzY3JpcHQnO1xuaW1wb3J0IGhhbWJ1cmdlciBmcm9tICcuL21vZHVsZXMvaGFtYnVyZ2VyJztcbmltcG9ydCBwYWdlU2Nyb2xsIGZyb20gJy4vbW9kdWxlcy9wYWdlU2Nyb2xsJztcblxuKCgkKSA9PiB7XG4gIC8vIFdoZW4gRE9NIGlzIHJlYWR5XG4gICQoKCkgPT4ge1xuICAgICQoJyNjdXJyZW50WWVhcicpLnRleHQoYCR7bmV3IERhdGUoKS5nZXRGdWxsWWVhcigpfWApO1xuICAgIHBhZ2VTY3JvbGwuc21vb3RoU2Nyb2xsaW5nKCk7XG4gICAgaGFtYnVyZ2VyLmhhbmRsZXIoKTtcbiAgICBobGpzLnJlZ2lzdGVyTGFuZ3VhZ2UoJ2phdmFzY3JpcHQnLCBqYXZhc2NyaXB0KTtcbiAgICBobGpzLmluaXRIaWdobGlnaHRpbmdPbkxvYWQoKTtcbiAgfSk7XG59KShqUXVlcnkpO1xuIiwiY29uc3QgaGFtYnVyZ2VyID0ge1xuICBoYW5kbGVyKCkge1xuICAgIGNvbnN0ICRib2R5ID0gJCgnYm9keScpO1xuICAgIGNvbnN0ICRidG4gPSAkKCcuaGFtYnVyZ2VyJyk7XG4gICAgY29uc3QgJG1lbnUgPSAkKCcubWVudScpO1xuICAgIGNvbnN0ICRzdWJtZW51ID0gJCgnLnN1Ym1lbnUnKTtcbiAgICBjb25zdCAkc3VibWVudUxpbmsgPSAkKCcubWVudV9fbGluay0tc3VibWVudScpO1xuICAgIGNvbnN0ICRzdWJtZW51Q2xvc2UgPSAkKCcuc3VibWVudV9faXRlbS0tc3RhdGljJyk7XG4gICAgY29uc3QgT1BFTkVEX0NMQVNTID0gJ29wZW5lZCc7XG4gICAgY29uc3QgT1ZFUkxBWV9DTEFTUyA9ICdvdmVybGF5JztcbiAgICBmdW5jdGlvbiBoYW1idXJnZXJUb2dnbGUoKSB7XG4gICAgICAkYnRuLm9uKCdjbGljaycsIGZ1bmN0aW9uIHN3aXRjaGVyKCkge1xuICAgICAgICAkKHRoaXMpLnRvZ2dsZUNsYXNzKE9QRU5FRF9DTEFTUyk7XG4gICAgICAgICRtZW51LnRvZ2dsZUNsYXNzKE9QRU5FRF9DTEFTUyk7XG4gICAgICAgICRib2R5LnRvZ2dsZUNsYXNzKE9WRVJMQVlfQ0xBU1MpO1xuICAgICAgICAkc3VibWVudS5yZW1vdmVDbGFzcyhPUEVORURfQ0xBU1MpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHN1Ym1lbnVUb2dnbGUoKSB7XG4gICAgICAkc3VibWVudUxpbmsub24oJ2NsaWNrJywgKGV2ZW50KSA9PiB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICRzdWJtZW51LnRvZ2dsZUNsYXNzKE9QRU5FRF9DTEFTUyk7XG4gICAgICB9KTtcbiAgICAgICRzdWJtZW51Q2xvc2Uub24oJ2NsaWNrJywgKGV2ZW50KSA9PiB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICRzdWJtZW51LnRvZ2dsZUNsYXNzKE9QRU5FRF9DTEFTUyk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgZnVuY3Rpb24gaW5pdCgpIHtcbiAgICAgIGlmICghJGJ0bi5sZW5ndGgpIHJldHVybjtcbiAgICAgIGhhbWJ1cmdlclRvZ2dsZSgpO1xuICAgICAgaWYgKCEkc3VibWVudS5sZW5ndGgpIHJldHVybjtcbiAgICAgIHN1Ym1lbnVUb2dnbGUoKTtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIGluaXQ6IGluaXQoKSxcbiAgICB9O1xuICB9LFxufTtcblxuZXhwb3J0IGRlZmF1bHQgaGFtYnVyZ2VyO1xuIiwiY29uc3QgcGFnZVNjcm9sbCA9IHtcbiAgc21vb3RoU2Nyb2xsaW5nKCkge1xuICAgIGNvbnN0ICR3aW5kb3cgPSAkKHdpbmRvdyk7XG4gICAgY29uc3QgJHBhZ2UgPSAkKCdodG1sLCBib2R5Jyk7XG4gICAgY29uc3QgJGJvZHkgPSAkKCdib2R5Jyk7XG4gICAgY29uc3QgJG1lbnUgPSAkKCcubWVudScpO1xuICAgIGNvbnN0ICRhbmNob3JMaW5rID0gJCgnYVtocmVmXj1cIiNcIl0nKTtcbiAgICBjb25zdCBBTklNQVRJT05fU1BFRUQgPSA0MDA7XG4gICAgY29uc3QgSEVBREVSX0hFSUdIVCA9IDA7XG4gICAgY29uc3QgT1ZFUkZMT1dfQ0xBU1MgPSAnb3ZlcmZsb3ctaGlkZGVuJztcbiAgICBjb25zdCBNT0JJTEVfVklFV19PTiA9IDEwMjQ7XG4gICAgZnVuY3Rpb24gc2Nyb2xsaW5nKCkge1xuICAgICAgJGFuY2hvckxpbmsub24oJ2NsaWNrJywgZnVuY3Rpb24gc2Nyb2xsVG8oZXZlbnQpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgY29uc3QgJHBvc2l0aW9uID0gJCgkLmF0dHIodGhpcywgJ2hyZWYnKSkub2Zmc2V0KCkudG9wO1xuICAgICAgICAkcGFnZS5hbmltYXRlKHtcbiAgICAgICAgICBzY3JvbGxUb3A6IGAkeyRwb3NpdGlvbiAtIEhFQURFUl9IRUlHSFR9cHhgLFxuICAgICAgICB9LCBBTklNQVRJT05fU1BFRUQpO1xuICAgICAgICBpZiAoJHdpbmRvdy53aWR0aCgpIDw9IE1PQklMRV9WSUVXX09OKSB7XG4gICAgICAgICAgJG1lbnUuZmFkZU91dCgpO1xuICAgICAgICAgICRib2R5LnJlbW92ZUNsYXNzKE9WRVJGTE9XX0NMQVNTKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9KTtcbiAgICB9XG4gICAgZnVuY3Rpb24gaW5pdCgpIHtcbiAgICAgIGlmICghJHBhZ2UubGVuZ3RoKSByZXR1cm47XG4gICAgICBzY3JvbGxpbmcoKTtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIGluaXQ6IGluaXQoKSxcbiAgICB9O1xuICB9LFxufTtcblxuZXhwb3J0IGRlZmF1bHQgcGFnZVNjcm9sbDtcbiJdfQ==
