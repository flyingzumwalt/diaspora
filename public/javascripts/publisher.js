/*   Copyright (c) 2010, Diaspora Inc.  This file is
 *   licensed under the Affero General Public License version 3 or later.  See
 *   the COPYRIGHT file.
 */
	var KEY = {
		UP: 38,
		DOWN: 40,
		DEL: 46,
		TAB: 9,
		RETURN: 13,
		ESC: 27,
		COMMA: 188,
		PAGEUP: 33,
		PAGEDOWN: 34,
		BACKSPACE: 8
	};
//TODO: make this a widget
var Publisher = {
  close: function(){
    Publisher.form().addClass('closed');
    Publisher.form().find(".options_and_submit").hide();
         },
  open: function(){
    Publisher.form().removeClass('closed');
    Publisher.form().find(".options_and_submit").show();
  },
  cachedForm : false,
  form: function(){
    if(!Publisher.cachedForm){
      Publisher.cachedForm = $('#publisher');
    }
    return Publisher.cachedForm;
  },
  cachedInput : false,
  input: function(){
    if(!Publisher.cachedInput){
      Publisher.cachedInput = Publisher.form().find('#status_message_fake_message');
    }
    return Publisher.cachedInput;
  },

  cachedHiddenInput : false,
  hiddenInput: function(){
    if(!Publisher.cachedHiddenInput){
      Publisher.cachedHiddenInput = Publisher.form().find('#status_message_message');
    }
    return Publisher.cachedHiddenInput;
  },

  autocompletion: {
    options : function(){return {
      minChars : 1,
      max : 5,
      onSelect : Publisher.autocompletion.onSelect,
      searchTermFromValue: Publisher.autocompletion.searchTermFromValue,
      scroll : false,
      formatItem: function(row, i, max) {
          return "<img src='"+ row.avatar +"' class='avatar'/>" + row.name;
      },
      formatMatch: function(row, i, max) {
          return row.name;
      },
      formatResult: function(row) {
          return row.name;
      }
    };},
    hiddenMentionFromPerson : function(personData){
      return "@{" + personData.name + "; " + personData.handle + "}";
    },

    onSelect :  function(visibleInput, data, formatted) {
      var visibleCursorIndex = visibleInput[0].selectionStart;
      var visibleLoc = Publisher.autocompletion.addMentionToInput(visibleInput, visibleCursorIndex, formatted);
      $.Autocompleter.Selection(visibleInput[0], visibleLoc[1], visibleLoc[1]);

      var mentionString = Publisher.autocompletion.hiddenMentionFromPerson(data);
      var mention = { visibleStart: visibleLoc[0],
                      visibleEnd  : visibleLoc[1],
                      mentionString : mentionString
                    };
      Publisher.autocompletion.mentionList.push(mention);
      Publisher.oldInputContent = visibleInput.val();
      Publisher.hiddenInput().val(Publisher.autocompletion.mentionList.generateHiddenInput(visibleInput.val()));
    },

    mentionList : {
      mentions : [],
      sortedMentions : function(){
        return this.mentions.sort(function(m1, m2){
          if(m1.visibleStart > m2.visibleStart){
            return -1;
          } else if(m1.visibleStart < m2.visibleStart){
            return 1;
          } else {
            return 0;
          }
        });
      },
      push : function(mention){
        this.mentions.push(mention);
      },
      generateHiddenInput : function(visibleString){
        var resultString = visibleString;
        for(i in this.sortedMentions()){
          var mention = this.mentions[i];
          var start = resultString.slice(0, mention.visibleStart);
          var insertion = mention.mentionString;
          var end = resultString.slice(mention.visibleEnd);

          resultString = start + insertion + end;
        }
        return resultString;
      },

      insertionAt : function(insertionEndIndex, insertionStartIndex, keyCode){
        this.incrementMentionLocations(insertionStartIndex, insertionEndIndex - insertionStartIndex);
        var mentionIndex = this.mentionAt(insertionEndIndex);

        var mention = this.mentions[mentionIndex];
        if(mention){
          this.mentions.splice(mentionIndex, 1);
        }

      },
      deletionAt : function(visibleCursorIndex, keyCode){

        var effectiveCursorIndex;
        if(keyCode == KEY.DEL){
          effectiveCursorIndex = visibleCursorIndex;
        }else{
          effectiveCursorIndex = visibleCursorIndex - 1;
        }
        this.decrementMentionLocations(effectiveCursorIndex, keyCode);

        var mentionIndex = this.mentionAt(effectiveCursorIndex);

        var mention = this.mentions[mentionIndex];
        if(mention){
          this.mentions.splice(mentionIndex, 1);
        }

      },
      incrementMentionLocations : function(effectiveCursorIndex, offset){
        var changedMentions = this.mentionsAfter(effectiveCursorIndex);
        for(i in changedMentions){
          var mention = changedMentions[i];
          mention.visibleStart += offset;
          mention.visibleEnd += offset;
        }
      },
      decrementMentionLocations : function(effectiveCursorIndex){
        var visibleOffset = -1;
        var changedMentions = this.mentionsAfter(effectiveCursorIndex);
        for(i in changedMentions){
          var mention = changedMentions[i];
          mention.visibleStart += visibleOffset;
          mention.visibleEnd += visibleOffset;
        }
      },
      mentionAt : function(visibleCursorIndex){
        for(i in this.mentions){
          var mention = this.mentions[i];
          if(visibleCursorIndex > mention.visibleStart && visibleCursorIndex < mention.visibleEnd){
            return i;
          }
        }
        return false;
      },
      mentionsAfter : function(visibleCursorIndex){
        var resultMentions = [];
        for(i in this.mentions){
          var mention = this.mentions[i];
          if(visibleCursorIndex <= mention.visibleStart){
            resultMentions.push(mention);
          }
        }
        return resultMentions;
      },
    },
    repopulateHiddenInput: function(){
      var newHiddenVal = Publisher.autocompletion.mentionList.generateHiddenInput(Publisher.input().val());
      if(newHiddenVal != Publisher.hiddenInput().val()){
        Publisher.hiddenInput().val(newHiddenVal);
      }
    },

    keyUpHandler : function(event){
      var input = Publisher.input();
      var cursorIndexAtKeydown = Publisher.cursorIndexAtKeydown;
      Publisher.cursorIndexAtKeydown = -1;
      if(input.val() == Publisher.oldInputContent || event.keyCode == KEY.RETURN || event.keyCode == KEY.DEL || event.keyCode == KEY.BACKSPACE){
        Publisher.autocompletion.repopulateHiddenInput();
        return;
      }else {
        Publisher.oldInputContent = input.val();
        var visibleCursorIndex = input[0].selectionStart;
        Publisher.autocompletion.mentionList.insertionAt(visibleCursorIndex, cursorIndexAtKeydown, event.keyCode);
        Publisher.autocompletion.repopulateHiddenInput();
      }
    },

    keyDownHandler : function(event){
      var input = Publisher.input();
      var visibleCursorIndex = input[0].selectionStart;
      if(Publisher.cursorIndexAtKeydown == -1){
        Publisher.cursorIndexAtKeydown = visibleCursorIndex;
      }

      if((event.keyCode == KEY.DEL && visibleCursorIndex < input.val().length) || (event.keyCode == KEY.BACKSPACE && visibleCursorIndex > 0)){
        Publisher.autocompletion.mentionList.deletionAt(visibleCursorIndex, event.keyCode);
      }
      Publisher.autocompletion.repopulateHiddenInput();
    },

    addMentionToInput: function(input, cursorIndex, formatted){
      var inputContent = input.val();

      var stringLoc = Publisher.autocompletion.findStringToReplace(input.val(), cursorIndex);

      var stringStart = inputContent.slice(0, stringLoc[0]);
      var stringEnd = inputContent.slice(stringLoc[1]);

      input.val(stringStart + formatted + stringEnd);
      var offset = formatted.length - stringLoc[1] - stringLoc[0]
      Publisher.autocompletion.mentionList.incrementMentionLocations(stringStart.length, offset);
      return [stringStart.length, stringStart.length + formatted.length]
    },

    findStringToReplace: function(value, cursorIndex){
      var atLocation = value.lastIndexOf('@', cursorIndex);
      if(atLocation == -1){return [0,0];}
      var nextAt = cursorIndex

      if(nextAt == -1){nextAt = value.length;}
      return [atLocation, nextAt];

    },

    searchTermFromValue: function(value, cursorIndex)
    {
      var stringLoc = Publisher.autocompletion.findStringToReplace(value, cursorIndex);
      if(stringLoc[0] <= 2){
        stringLoc[0] = 0;
      }else{
        stringLoc[0] -= 2
      }

      var relevantString = value.slice(stringLoc[0], stringLoc[1]).replace(/\s+$/,"");

      var matches = relevantString.match(/(^|\s)@(.+)/);
      if(matches){
        return matches[2];
      }else{
        return '';
      }
    },
    contactsJSON: function(){
      return $.parseJSON($('#contact_json').val());
    },
    initialize: function(){
      Publisher.input().autocomplete(Publisher.autocompletion.contactsJSON(),
        Publisher.autocompletion.options());
      Publisher.input().result(Publisher.autocompletion.selectItemCallback);
      Publisher.oldInputContent = Publisher.input().val();
    }
  },
  initialize: function() {
    Publisher.cachedForm = false;
    Publisher.cachedInput = false;
    Publisher.cachedHiddenInput = false;
    $("div.public_toggle input").live("click", function(evt) {
      $("#publisher_service_icons").toggleClass("dim");
      if ($(this).attr('checked') == true) {
        $(".question_mark").click();
      }
    });

    if ($("#status_message_fake_message").val() == "") {
      Publisher.close();
    };

    Publisher.autocompletion.initialize();
    Publisher.hiddenInput().val(Publisher.input().val());
    Publisher.input().keydown(Publisher.autocompletion.keyDownHandler);
    Publisher.input().keyup(Publisher.autocompletion.keyUpHandler);
    Publisher.form().find("textarea").bind("focus", function(evt) {
      Publisher.open();
      $(this).css('min-height', '42px');
    });
  }
};

$(document).ready(function() {
  Publisher.initialize();
});
