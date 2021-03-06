require File.expand_path(File.dirname(__FILE__) + '/common')

describe "grading standards" do
  it_should_behave_like "in-process server selenium tests"
  
  it "should allow creating/deleting grading standards" do
    course_with_teacher_logged_in

    get "/courses/#{@course.id}/grading_standards"
    driver.find_element(:css, ".add_standard_link").click
    standard = driver.find_element(:css, "#grading_standard_new")
    standard.should_not be_nil
    standard.attribute(:class).should match(/editing/)
    standard.find_elements(:css, ".delete_row_link").select(&:displayed?).each_with_index do |link, i|
      if i % 2 == 1
        link.click
        wait_for_animations
        keep_trying_until { !link.displayed? }
      end
    end
    standard.find_element(:css, "input.scheme_name").send_keys("New Standard")
    standard.find_element(:css, ".save_button").click
    keep_trying_until { !standard.attribute(:class).match(/editing/) }
    standard.find_elements(:css, ".grading_standard_row").select(&:displayed?).length.should eql(6)
    standard.find_element(:css, ".standard_title .title").text.should eql("New Standard")
    
    id = standard.attribute(:id)
    standard.find_element(:css, ".delete_grading_standard_link").click
    driver.switch_to.alert.accept
    driver.switch_to.default_content
    keep_trying_until { !(driver.find_element(:css, "##{id}") rescue nil) }
  end
  
  it "should allow setting a grading standard for an assignment" do
    skip_if_ie("Out of memory")
    course_with_teacher_logged_in
    
    @assignment = @course.assignments.create!(:title => "new assignment")
    @standard = @course.grading_standards.create!(:title => "some standard", :standard_data => {:a => {:name => 'A', :value => '95'}, :b => {:name => 'B', :value => '80'}, :f => {:name => 'F', :value => ''}})

    get "/courses/#{@course.id}/assignments/#{@assignment.id}"
    driver.find_element(:css, ".edit_full_assignment_link").click
    form = driver.find_element(:css, "#edit_assignment_form")
    form.find_element(:css, ".more_options_link").click
    form.find_element(:css, ".grading_type option[value='letter_grade']").click
    form.find_element(:css, ".edit_letter_grades_link").displayed?.should be_true
    form.find_element(:css, ".edit_letter_grades_link").click
    
    dialog = driver.find_element(:css, "#edit_letter_grades_form")
    dialog.find_elements(:css, ".grading_standard_row").select(&:displayed?).length.should eql(12)
    dialog.find_elements(:css, ".grading_standard_row").select(&:displayed?).map{|e| e.find_element(:css, ".name").text }.should eql(["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"])
    
    dialog.find_element(:css, ".find_grading_standard_link").click
    keep_trying_until { driver.find_element(:css, ".find_grading_standard").attribute(:class).match(/loaded/) }
    dialog.find_element(:css, ".find_grading_standard").displayed?.should be_true
    dialog.find_element(:css, ".display_grading_standard").displayed?.should be_false
    dialog.find_element(:css, ".cancel_find_grading_standard_link").click
    dialog.find_element(:css, ".find_grading_standard").displayed?.should be_false
    dialog.find_element(:css, ".display_grading_standard").displayed?.should be_true
    dialog.find_element(:css, ".find_grading_standard_link").click
    
    dialog.find_elements(:css, ".grading_standard_select .title")[-1].text.should eql(@standard.title)
    dialog.find_elements(:css, ".grading_standard_select")[-1].click
    dialog.find_element(:css, "#grading_standard_brief_#{@standard.id}").displayed?.should be_true
    dialog.find_element(:css, "#grading_standard_brief_#{@standard.id} .select_grading_standard_link").click
    dialog.find_element(:css, "#grading_standard_brief_#{@standard.id}").displayed?.should be_false
    dialog.find_element(:css, ".display_grading_standard").displayed?.should be_true
    dialog.find_element(:css, ".standard_title .title").text.should eql(@standard.title)
    sleep 2
  end
  
  it "should allow setting a grading standard for a course" do
    course_with_teacher_logged_in

    @standard = @course.grading_standards.create!(:title => "some standard", :standard_data => {:a => {:name => 'A', :value => '95'}, :b => {:name => 'B', :value => '80'}, :f => {:name => 'F', :value => ''}})

    get "/courses/#{@course.id}/details#tab-details"
    driver.find_element(:css, ".edit_course_link").click
    form = driver.find_element(:css, "#course_form")
    form.find_element(:css, "#course_grading_standard_enabled").click
    form.find_element(:css, "#course_grading_standard_enabled").attribute(:checked).should eql('true')
    
    form.find_element(:css, ".edit_letter_grades_link").displayed?.should be_true
    form.find_element(:css, ".edit_letter_grades_link").click
    
    dialog = driver.find_element(:css, "#edit_letter_grades_form")
    dialog.find_elements(:css, ".grading_standard_row").select(&:displayed?).length.should eql(12)
    dialog.find_elements(:css, ".grading_standard_row").select(&:displayed?).map{|e| e.find_element(:css, ".name").text }.should eql(["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"])
    
    dialog.find_element(:css, ".find_grading_standard_link").click
    keep_trying_until { driver.find_element(:css, ".find_grading_standard").attribute(:class).match(/loaded/) }
    dialog.find_elements(:css, ".grading_standard_select .title")[-1].text.should eql(@standard.title)
    dialog.find_elements(:css, ".grading_standard_select")[-1].click
    (standard_brief = dialog.find_element(:css, "#grading_standard_brief_#{@standard.id}")).displayed?.should be_true
    rows = standard_brief.find_elements(:css, '.details_row')
    rows.shift['class'].should match /blank/
    rows.length.should == @standard.data.length
    rows.each_with_index do |r, idx|
      r.find_element(:css, '.name').text.should == @standard.data[idx].first
      r.find_element(:css, '.value').text.should == (idx == 0 ? "100" : "< #{@standard.data[idx - 1].last * 100}")
      r.find_element(:css, '.next_value').text.should == "#{@standard.data[idx].last * 100}"
    end
    dialog.find_element(:css, "#grading_standard_brief_#{@standard.id} .select_grading_standard_link").click
    dialog.find_element(:css, "#grading_standard_brief_#{@standard.id}").displayed?.should be_false
    dialog.find_element(:css, ".display_grading_standard").displayed?.should be_true
    dialog.find_element(:css, ".standard_title .title").text.should eql(@standard.title)

    dialog.find_element(:css, ".remove_grading_standard_link").displayed?.should be_true
    dialog.find_element(:css, ".remove_grading_standard_link").click
    driver.switch_to.alert.accept
    driver.switch_to.default_content
    keep_trying_until { !dialog.displayed? }
    
    form.find_element(:css, "#course_grading_standard_enabled").attribute(:checked).should be_nil
  end

  it "should extend ranges to fractional values at the boundary with the next range" do
    student = user(:active_all => true)
    course_with_teacher_logged_in(:active_all => true)
    @course.enroll_student(student).accept!
    @course.update_attribute :grading_standard_id, 0
    @course.assignment_groups.create!
    @assignment = @course.assignments.create!(:title => "new assignment", :points_possible => 1000, :assignment_group => @course.assignment_groups.first, :grading_type => 'points')
    @assignment.grade_student(student, :grade => 899)
    get "/courses/#{@course.id}/grades/#{student.id}"
    driver.find_element(:css, '#right-side .final_grade .grade').text.should == '89.9'
    driver.find_element(:css, '#right-side .final_letter_grade .grade').text.should == 'B+'
  end

  it "should allow editing the standard again without reloading the page" do
    user_session(account_admin_user)
    @standard = Account.default.grading_standards.create!(:title => "some standard", :standard_data => {:a => {:name => 'A', :value => '95'}, :b => {:name => 'B', :value => '80'}, :f => {:name => 'F', :value => ''}})
    get("/accounts/#{Account.default.id}/grading_standards")
    std = keep_trying_until { driver.find_element(:css, "#grading_standard_#{@standard.id}") }
    std.find_element(:css, ".edit_grading_standard_link").click
    std.find_element(:css, "button.save_button").click
    wait_for_ajax_requests
    std = keep_trying_until { driver.find_element(:css, "#grading_standard_#{@standard.id}") }
    std.find_element(:css, ".edit_grading_standard_link").click
    std.find_element(:css, "button.save_button").click
    wait_for_ajax_requests
    @standard.reload.data.length.should == 3
  end
end

