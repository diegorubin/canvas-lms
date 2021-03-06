require File.expand_path(File.dirname(__FILE__) + '/common')

describe "external migrations" do
  it_should_behave_like "forked server selenium tests"

  append_after(:all) do
    Setting.remove("file_storage_test_override")
  end

  before(:each) do
    @password = "asdfasdf"
    @teacher = user_with_pseudonym :active_user => true,
                                   :username => "teacher@example.com",
                                   :password => @password
    @teacher.save!

    @course = course :active_course => true
    @course.enroll_teacher(@teacher).accept!
    @course.reload
  end
  
  after(:each) do
    if @migration
      [@migration.attachment, @migration.overview_attachment, @migration.exported_attachment].each do |att|
        next unless att && att.respond_to?(:full_filename)
        filename = att.full_filename
        if File.exists?(filename)
          begin
            FileUtils::rm_rf(filename)
          rescue
            Rails.logger.warn "Couldn't delete #{filename} for content_migration selenium spec"
          end
        end
      end
    end
  end
  
  it "should import a common cartridge" do
    login_as(@teacher.email, @password)

    get "/courses/#{@course.id}/imports/migrate"

    filename, fullpath, data = get_file("cc_full_test.zip")

    driver.find_element(:css, '#choose_migration_system').
            find_element(:css, 'option[value="common_cartridge_importer"]').click
    driver.find_element(:css, '#config_options').
            find_element(:name, 'export_file').send_keys(fullpath)
    driver.find_element(:css, '#config_options').
            find_element(:css, '.submit_button').click
    keep_trying_until { driver.find_element(:css, '#file_uploaded').displayed? }

    ContentMigration.for_context(@course).count.should == 1
    @migration = ContentMigration.for_context(@course).first
    @migration.attachment.should_not be_nil
    job = @migration.export_content
    job.invoke_job
    
    @migration.reload
    @migration.workflow_state.should == 'exported'

    get "/courses/#{@course.id}/imports/migrate/#{@migration.id}"
    wait_for_ajaximations
    keep_trying_until { find_with_jquery("#copy_everything").should be_displayed }
    
    driver.find_element(:id, 'copy_everything').click
    driver.find_element(:id, 'copy_all_quizzes').click if Qti.migration_executable
    driver.find_element(:id, 'copy_folders_I_00001_R_').click
    driver.find_element(:id, 'copy_folders_I_00006_Media_').click
    driver.find_element(:id, 'copy_folders_I_media_R_').click
    driver.find_element(:id, 'copy_modules_I_00000_').click
    driver.find_element(:id, 'copy_topics_I_00009_R_').click
    driver.find_element(:id, 'copy_topics_I_00006_R_').click
    driver.find_element(:id, 'copy_external_tools_I_00010_R_').click

    expect_new_page_load {
      driver.find_element(:id, 'copy_context_form').submit
      wait_for_ajaximations

      # since jobs aren't running
      @migration.reload
      @migration.import_content_without_send_later
    }
    
    driver.current_url.ends_with?("/courses/#{@course.id}").should == true
    
    @course.reload
    @course.discussion_topics.count.should == 2
    @course.quizzes.count.should == 1 if Qti.migration_executable
    @course.attachments.count.should == 3
    @course.context_modules.count.should == 1
    @course.context_external_tools.count.should == 1
    @course.folders.count.should == 4
  end

end