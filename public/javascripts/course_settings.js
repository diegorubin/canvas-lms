/**
 * Copyright (C) 2011 Instructure, Inc.
 *
 * This file is part of Canvas.
 *
 * Canvas is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, version 3 of the License.
 *
 * Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

I18n.scoped('course_settings', function(I18n) {

  var GradePublishing = {
    status: null,
    checkup: function() {
      $.ajaxJSON($("#publish_to_sis_form").attr('action'), 'GET', {}, function(data) {
        if (!data.hasOwnProperty("sis_publish_overall_status")) return;
        GradePublishing.status = data.sis_publish_overall_status;
        GradePublishing.update(data.hasOwnProperty("sis_publish_statuses") ? data.sis_publish_statuses : {});
      });
    },
    update: function(messages, requestInProgress) {
      var $publish_grades_link = $("#publish_grades_link"),
          $publish_grades_error = $("#publish_grades_error");
      if (GradePublishing.status == 'published') {
        $publish_grades_error.hide();
        $publish_grades_link.html(I18n.t('links.republish', "Republish grades to SIS"));
        $publish_grades_link.removeClass("disabled");
      } else if (GradePublishing.status == 'publishing' || GradePublishing.status == 'pending') {
        $publish_grades_error.hide();
        $publish_grades_link.html(I18n.t('links.publishing', "Publishing grades to SIS..."));
        if (!requestInProgress) {
          setTimeout(GradePublishing.checkup, 5000);
        }
        $publish_grades_link.addClass("disabled");
      } else if (GradePublishing.status == 'unpublished') {
        $publish_grades_error.hide();
        $publish_grades_link.html(I18n.t('links.publish', "Publish grades to SIS"));
        $publish_grades_link.removeClass("disabled");
      } else {
        $publish_grades_error.show();
        $publish_grades_link.html(I18n.t('links.republish', "Republish grades to SIS"));
        $publish_grades_link.removeClass("disabled");
      }
      $messages = $("#publish_grades_messages");
      $messages.empty();
      $.each(messages, function(message, users) {
        var $message = $("<span/>");
        $message.text(message);
        var $item = $("<li/>");
        $item.append($message);
        $item.append(" - <b>" + users.length + "</b>");
        $messages.append($item);
      });
    },
    publish: function() {
      if (GradePublishing.status == 'publishing' || GradePublishing.status == 'pending' || GradePublishing.status == null) {
        return;
      }
      if (GradePublishing.status == 'published') {
        if (!confirm(I18n.t('confirm.re_publish_grades', "Are you sure you want to republish these grades to the student information system?")))
          return;
      } else {
        if (!confirm(I18n.t('confirm.publish_grades', "Are you sure you want to publish these grades to the student information system? You should only do this if all your grades have been finalized.")))
          return;
      }
      var $publish_to_sis_form = $("#publish_to_sis_form");
      GradePublishing.status = "publishing";
      GradePublishing.update({}, true);
      var successful_statuses = { "published": 1, "publishing": 1, "pending": 1 };
      var error = function(data, xhr, status, error) {
        GradePublishing.status = "unknown";
        $.flashError(I18n.t('errors.publish_grades', "Something went wrong when trying to publish grades to the student information system. Please try again later."));
        GradePublishing.update({});
      };
      $.ajaxJSON($publish_to_sis_form.attr('action'), 'POST', $publish_to_sis_form.getFormData(), function(data) {
        if (!data.hasOwnProperty("sis_publish_overall_status") || !successful_statuses.hasOwnProperty(data["sis_publish_overall_status"])) {
          error(null, null, I18n.t('errors.invalid_sis_status', "Invalid SIS publish status"), null);
          return;
        }
        GradePublishing.status = data.sis_publish_overall_status;
        GradePublishing.update(data.hasOwnProperty("sis_publish_statuses") ? data.sis_publish_statuses : {});
      }, error);
    }
  }


  $(document).ready(function() {
    var $add_section_form = $("#add_section_form"),
        $edit_section_form = $("#edit_section_form"),
        $course_form = $("#course_form"),
        $hashtag_form = $(".hashtag_form"),
        $course_hashtag = $("#course_hashtag"),
        $enroll_users_form = $("#enroll_users_form"),
        $enrollment_dialog = $("#enrollment_dialog");
        
    $("#course_details_tabs").tabs({cookie: {}}).show();
        
    $add_section_form.formSubmit({
      required: ['course_section[name]'],
      beforeSubmit: function(data) {
        $add_section_form.find("button").attr('disabled', true).text(I18n.t('buttons.adding_section', "Adding Section..."));
      },
      success: function(data) {
        var section = data.course_section,
            $section = $(".section_blank:first").clone(true).attr('class', 'section'),
            $option = $("<option/>");
            
        $add_section_form.find("button").attr('disabled', false).text(I18n.t('buttons.add_section', "Add Section"));
        $section.fillTemplateData({
          data: section,
          hrefValues: ['id']
        });
        $("#course_section_id_holder").show();
        $option.val(section.id).text(section.name).addClass('option_for_section_' + section.id);
        $("#sections .section_blank").before($section);
        $section.slideDown();
        $("#course_section_name").val();
      },
      error: function(data) {
        $add_section_form
          .formErrors(data)
          .find("button").attr('disabled', false).text(I18n.t('errors.section', "Add Section Failed, Please Try Again"));
      }
    });
    $(".cant_delete_section_link").click(function(event) {
      alert($(this).attr('title'));
      return false;
    });
    $edit_section_form.formSubmit({
      beforeSubmit: function(data) {
        $edit_section_form.hide();
        var $section = $edit_section_form.parents(".section");
        $section.find(".name").text(data['course_section[name]']).show();
        $section.loadingImage({image_size: "small"});
        return $section;
      },
      success: function(data, $section) {
        var section = data.course_section;
        $section.loadingImage('remove');
        $(".option_for_section_" + section.id).text(section.name);
      },
      error: function(data, $section) {
        $section.loadingImage('remove').find(".edit_section_link").click();
        $edit_section_form.formErrors(data);
      }
    })
    .find(":text")
      .bind('blur', function() {
        $edit_section_form.submit();
      })
      .keycodes('return esc', function(event) {
        if(event.keyString == 'return') {
          $edit_section_form.submit();
        } else {
          $(this).parents(".section").find(".name").show();
          $("body").append($edit_section_form.hide());
        }
      });
    $(".edit_section_link").click(function() {
      var $this = $(this),
          $section = $this.parents(".section"),
          data = $section.getTemplateData({textValues: ['name']});
      $edit_section_form.fillFormData(data, {object_name: "course_section"});
      $section.find(".name").hide().after($edit_section_form.show());
      $edit_section_form.attr('action', $this.attr('href'));
      $edit_section_form.find(":text:first").focus().select();
      return false;
    });
    $(".delete_section_link").click(function() {
      $(this).parents(".section").confirmDelete({
        url: $(this).attr('href'),
        message: I18n.t('confirm.delete_section', "Are you sure you want to delete this section?"),
        success: function(data) {
          $(this).slideUp(function() {
            $(this).remove();
          });
        }
      });
      return false;
    });
    $("#nav_form").submit(function(){
      tab_id_regex = /(\d+)$/;
      function tab_id_from_el(el) {
        var tab_id_str = $(el).attr("id");
        if (tab_id_str) {
          var tab_id = tab_id_str.replace(/^nav_edit_tab_id_/, '');
          if (tab_id.length > 0) {
            if(!tab_id.match(/context/)) {
              tab_id = parseInt(tab_id, 10);
            }
            return tab_id;
          }
        }
        return null;
      }
      
      var tabs = [];
      $("#nav_enabled_list li").each(function() {
        var tab_id = tab_id_from_el(this);
        if (tab_id !== null) { tabs.push({ id: tab_id }); }
      });
      $("#nav_disabled_list li").each(function() {
        var tab_id = tab_id_from_el(this);
        if (tab_id !== null) { tabs.push({ id: tab_id, hidden: true }); }
      });
      
      $("#tabs_json").val(JSON.stringify(tabs));
      return true;
    });
    
    $(".edit_nav_link").click(function(event) {
      event.preventDefault();
      $("#nav_form").dialog('close').dialog({
        modal: true,
        resizable: false,
        width: 400
      }).dialog('open');
    });
    
    $("#nav_enabled_list, #nav_disabled_list").sortable({
      items: 'li.enabled',
      connectWith: '.connectedSortable',
      axis: 'y'
    }).disableSelection();

    
    $(".hashtag_dialog_link").click(function(event) {
      event.preventDefault();
      $("#hashtag_dialog").dialog('close').dialog({
        autoOpen: false,
        title: I18n.t('titles.hashtag_help', "What's a Hashtag?"),
        width: 500
      }).dialog('open');
    });
    $(".close_dialog_button").click(function() {
      $("#hashtag_dialog").dialog('close');
    });
    $("#course_hashtag").bind('blur change keyup', function() {
      var val = $(this).val() || "";
      val = val.replace(/(\s)+/g, "_").replace(/#/, "");
      $("#hashtag_options").showIf(val && val !== "");
      $(this).val(val);
    });
    $(document).fragmentChange(function(event, hash) {
      function handleFragmentType(val){
        $("#tab-users-link").click();
        $(".add_users_link:visible").click();
        $("#enroll_users_form select[name='enrollment_type']").val(val);
      }
      if(hash == "#add_students") {
        handleFragmentType("StudentEnrollment");
      } else if(hash == "#add_tas") {
        handleFragmentType("TaEnrollment");
      } else if(hash == "#add_teacher") {
        handleFragmentType("TeacherEnrollment");
      }
    });
    $(".edit_course_link").click(function(event) {
      event.preventDefault();
      $("#course_form").addClass('editing').find(":text:first").focus().select();
      $("#course_account_id_lookup").autocomplete({
        source: $("#course_account_id_url").attr('href'),
        select: function(event, ui){
          $("#course_account_id").val(ui.item.id);
        }
      });
      $hashtag_form.showIf($course_hashtag.text().length > 0);
      $course_hashtag.triggerHandler('blur');
    });
    $(".move_course_link").click(function(event) {
      event.preventDefault();
      $("#move_course_dialog").dialog('close').dialog({
        autoOpen: false,
        title: I18n.t('titles.move_course', "Move Course"),
        width: 500
      }).dialog('open');
    });
    $("#move_course_dialog").delegate('.cancel_button', 'click', function() {
      $("#move_course_dialog").dialog('close');
    });
    $course_form.find(".grading_standard_checkbox").change(function() {
      $course_form.find(".grading_standard_link").showIf($(this).attr('checked'));
    }).change();
    $course_form.formSubmit({
      processData: function(data) {
        data['course[hashtag]'] = (data['course[hashtag]'] || "").replace(/\s/g, "_").replace(/#/g, "");
        if(data['course[start_at]']) {
          data['course[start_at]'] += " 12:00am";
        }
        if(data['course[conclude_at]']) {
          data['course[conclude_at]'] += " 11:55pm";
        }
        return data;
      },
      beforeSubmit: function(data) {
        $(this).loadingImage().removeClass('editing');
        $(this).find(".readable_license,.account_name,.term_name,.grading_scheme_set").text("...");
        $(this).find(".storage_quota_mb").text(data['course[storage_quota_mb]']);
        $(".course_form_more_options").hide();
      },
      success: function(data) {
        var course = data.course;
        course.start_at = $.parseFromISO(course.start_at).datetime_formatted;
        course.conclude_at = $.parseFromISO(course.conclude_at).datetime_formatted;
        course.is_public = course.is_public ? I18n.t('public_course', 'Public') : I18n.t('private_course', 'Private');
        course.indexed = course.indexed ? I18n.t('indexed_course', "Included in public course index") : "";
        course.grading_scheme_set = course.grading_standard_title || (course.grading_standard_id ? I18n.t('grading_standard_set', "Currently Set") : I18n.t('grading_standard_unset', "Not Set"));
        course.restrict_dates = course.restrict_enrollments_to_course_dates ? I18n.t('course_dates_enforced', "Users can only participate in the course between these dates") : I18n.t('course_dates_unenforced', "These dates will not affect course availability");
        course.locale = $("#course_locale option[value='" + (course.locale || '') + "']").text();
        if (course.locale != $course_form.find('.locale').text()) {
          location.reload();
          return;
        }
        $(this).loadingImage('remove');
        $("#course_form .public_options").showIf(course.is_public);
        $("#course_form .self_enrollment_message").css('display', course.self_enrollment ? '' : 'none');
        $("#course_form").fillTemplateData({data: course});
        $(".hashtag_form").showIf($("#course_hashtag").text().length > 0);
      },
      error: function(data) {
        $(this).loadingImage('remove');
        $(".edit_course_link").click();
        $(this).formErrors(data);
      }
    })
    .find(".cancel_button")
      .click(function() {
        $course_form.removeClass('editing');
        $hashtag_form.showIf($course_hashtag.text().length > 0);
        $(".course_form_more_options").hide();
      }).end()
    .find(":text:not(.date_entry)").keycodes('esc', function() {
      $course_form.find(".cancel_button:first").click();
    });
    $enroll_users_form.hide();
    $(".add_users_link").click(function(event) {
      $(this).hide();
      event.preventDefault();
      $enroll_users_form.show();
      $("html,body").scrollTo($enroll_users_form);
      $enroll_users_form.find("textarea").focus().select();
    });
    $(".associate_user_link").click(function(event) {
      event.preventDefault();
      var $user = $(this).parents(".user");
      var data = $user.getTemplateData({textValues: ['name', 'associated_user_id', 'id']});
      link_enrollment.choose(data.name, data.id, data.associated_user_id, function(enrollment) {
        if(enrollment) {
          var user_name = enrollment.associated_user_name;
          $("#enrollment_" + enrollment.id)
            .find(".associated_user.associated").showIf(enrollment.associated_user_id).end()
            .find(".associated_user.unassociated").showIf(!enrollment.associated_user_id).end()
            .fillTemplateData({data: enrollment});
        }
      });
    });
    $(".course_info").attr('title', I18n.t('titles.click_to_edit', 'Click to Edit')).click(function(event) {
      if (event.target.nodeName == "INPUT") {
        return;
      }
      $(".edit_course_link:first").click();
      var $obj = $(this).parents("td").find(".course_form");
      if($obj.length) {
        $obj.focus().select();
      }
    });
    $(".course_form_more_options_link").click(function(event) {
      event.preventDefault();
      $(".course_form_more_options").slideToggle();
    });
    $(".user_list").delegate('.user', 'mouseover', function(event) {
      var $this = $(this),
          title = $this.attr('title'),
          pending_message = I18n.t('details.re_send_invitation', "This user has not yet accepted their invitation.  Click to re-send invitation.");
      
      if(title != pending_message) {
        $this.data('real_title', title);
      }
      if($this.hasClass('pending')) {
        $this.attr('title', pending_message).css('cursor', 'pointer');
      } else {
        $this.attr('title', $(this).data('real_title') || I18n.t('defaults.user_name', "User")).css('cursor', '');
      }
    });
    $enrollment_dialog.find(".cancel_button").click(function() {
      $enrollment_dialog.dialog('close');
    });
    
    $(".user_list").delegate('.user_information_link', 'click', function(event) {
      var $this = $(this),
          $user = $this.closest('.user'),
          pending = $user.hasClass('pending'),
          data = $user.getTemplateData({textValues: ['name', 'invitation_sent_at']}),
          admin = $user.parents(".teacher_enrollments,.ta_enrollments").length > 0;
      
      data.re_send_invitation_link = I18n.t('links.re_send_invitation', "Re-Send Invitation");
      $enrollment_dialog
        .data('user', $user)
        .find(".re_send_invitation_link")
          .attr('href', $user.find(".re_send_confirmation_url").attr('href')).end()
        .find(".student_enrollment_re_send").showIf(pending && !admin).end()
        .find(".admin_enrollment_re_send").showIf(pending && admin).end()
        .find(".accepted_enrollment_re_send").showIf(!pending).end()
        .find(".invitation_sent_at").showIf(pending).end()
        .fillTemplateData({data: data})
        .dialog('close')
        .dialog({ autoOpen: false, title: I18n.t('titles.enrollment_details', "Enrollment Details") })
        .dialog('open');
      return false;
    });
    $('.user_list .edit_section_link').click(function(event) {
      event.preventDefault();
      var $this = $(this);
      $user = $this.closest('.user');
      $user.find('.section').toggle();
      $user.find('.enrollment_course_section_form').toggle();
    });
    $('.user_list .enrollment_course_section_form #course_section_id').change(function (event) {
      var form = $(this).parent('form');
      var $this = $(this)
      var section = form.prev('.section')
      $.ajaxJSON(form.attr('action'), 'POST', form.getFormData(), function(data) {
        section.html($this.find('option[value="' + $this.val() + '"]').html());
        section.toggle();
        form.toggle();
      }, function(data) {
        $.flashError(I18n.t('errors.move_user', "Something went wrong moving the user to the new section. Please try again later."));
      });
    });
    
    $enrollment_dialog.find(".re_send_invitation_link").click(function(event) {
      event.preventDefault();
      var $link = $(this);
      $link.text(I18n.t('links.re_sending_invitation', "Re-Sending Invitation..."));
      var url = $link.attr('href');
      $.ajaxJSON(url, 'POST', {}, function(data) {
        $enrollment_dialog.fillTemplateData({data: {invitation_sent_at: I18n.t('invitation_sent_now', "Just Now")}});
        $link.text(I18n.t('invitation_sent', "Invitation Sent!"));
        var $user = $enrollment_dialog.data('user');
        if($user) {
          $user.fillTemplateData({data: {invitation_sent_at: I18n.t('invitation_sent_now', "Just Now")}});
        }
      }, function(data) {
        $link.text(I18n.t('errors.invitation', "Invitation Failed.  Please try again."));
      });
    });
    $(".date_entry").date_field();
    
    $().data('current_default_wiki_editing_roles', $("#course_default_wiki_editing_roles").val());
    $("#course_default_wiki_editing_roles").change(function() {
      var $this = $(this);
      $(".changed_default_wiki_editing_roles").showIf($this.val() != $().data('current_default_wiki_editing_roles'));
      $(".default_wiki_editing_roles_change").text($this.find(":selected").text());
    });
    
    $(".re_send_invitations_link").click(function(event) {
      event.preventDefault();
      var $button = $(this),
          oldText = I18n.t('links.re_send_all', "Re-Send All Unaccepted Invitations");
          
      $button.text(I18n.t('buttons.re_sending_all', "Re-Sending Unaccepted Invitations...")).attr('disabled', true);
      $.ajaxJSON($button.attr('href'), 'POST', {}, function(data) {
        $button.text(I18n.t('buttons.re_sent_all', "Re-Sent All Unaccepted Invitations!")).attr('disabled', false);
        $(".user_list .user.pending").each(function() {
          var $user = $(this);
          $user.fillTemplateData({data: {invitation_sent_at: I18n.t('invitation_sent_now', "Just Now")}});
        });
        setTimeout(function() {
          $button.text(oldText);
        }, 2500);
      }, function() {
        $button.text(I18n.t('errors.re_send_all', "Send Failed, Please Try Again")).attr('disabled', false);
      });
    });
    $("#enrollment_type").change(function() {
      $(".teacherless_invite_message").showIf($(this).find(":selected").hasClass('teacherless_invite'));
    });
    $(".is_public_checkbox").change(function() {
      $(".public_options").showIf($(this).attr('checked'));
    }).change();  
    
    $(".self_enrollment_checkbox").change(function() {
      $(".open_enrollment_holder").showIf($(this).attr('checked'));
    }).change();

    $("#publish_grades_link").click(function(event) {
      event.preventDefault();
      GradePublishing.publish();
    });
    if (typeof(sisPublishEnabled) != 'undefined' && sisPublishEnabled) {
      GradePublishing.checkup();
    }

    $(".reset_course_content_button").click(function(event) {
      event.preventDefault();
      $("#reset_course_content_dialog").dialog('close').dialog({
        autoOpen: false,
        title: I18n.t('titles.reset_course_content_dialog_help', "Reset Course Content"),
        width: 500
      }).dialog('open');
    });
    $("#reset_course_content_dialog .cancel_button").click(function() {
      $("#reset_course_content_dialog").dialog('close');
    });

    $.scrollSidebar();
  });
});
