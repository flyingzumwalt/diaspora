#   Copyright (c) 2010, Diaspora Inc.  This file is
#   licensed under the Affero General Public License version 3 or later.  See
#   the COPYRIGHT file.

require 'spec_helper'
include ApplicationHelper

describe PhotosController do
  render_views

  let(:user1) {Factory.create(:user)}
  let(:user2) {Factory.create(:user)}

  let(:aspect1) { user1.aspects.create(:name => 'winners') }
  let(:aspect2) { user2.aspects.create(:name => 'winners') }

  let(:filename)     { 'button.png' }
  let(:fixture_name) { File.join(File.dirname(__FILE__), '..', 'fixtures', filename) }
  let!(:photo1)      { user1.post(:photo, :user_file => File.open(fixture_name), :to => aspect1.id) }
  let!(:photo2)      { user2.post(:photo, :user_file => File.open(fixture_name), :to => aspect2.id) }

  before do
    connect_users(user1, aspect1, user2, aspect2)
    @controller.stub!(:current_user).and_return(user1)
    sign_in :user, user1
  end

  it 'has working context' do
    photo1.url.should_not be_nil
    Photo.find(photo1.id).url.should_not be_nil
    photo2.url.should_not be_nil
    Photo.find(photo2.id).url.should_not be_nil
  end

  describe '#create' do
    before do
      @controller.stub!(:file_handler).and_return(File.open(fixture_name))
      @params = {:photo => {:user_file => File.open(fixture_name), :aspect_ids => "all"} }
    end

    it 'can make a photo' do
      lambda {
        post :create, @params
      }.should change(Photo, :count).by(1)
    end
    it 'can set the photo as the profile photo' do
      old_url = user1.person.profile.image_url
      @params[:photo][:set_profile_photo] = true
      post :create, @params
      user1.reload.person.profile.image_url.should_not == old_url
    end
  end

  describe '#index' do
    it "displays the logged in user's pictures" do
      get :index,  :pod => user1.person.pod, :username => user1.person.username
      assigns[:person].should == user1.person
      assigns[:posts].should == [photo1]
    end

    it 'sets the person to a contact if person_id is set' do
      get :index, :pod => user2.person.pod, :username => user2.person.username

      assigns[:person].should == user2.person
      assigns[:posts].should be_empty
    end
  end

  describe '#show' do
    it 'assigns the photo based on the photo id' do
      get :show, :id => photo1.id
      response.status.should == 200

      assigns[:photo].should == photo1
      assigns[:ownership].should be_true
    end

  end

  describe '#edit' do
    it 'lets the user edit a photo' do
      get :edit, :id => photo1.id
      response.status.should == 200
    end

    it 'does not let the user edit a photo that is not his' do
      get :edit, :id => photo2.id
      response.should redirect_to(:action => :index, :pod => user1.person.pod, :username => user1.person.username)
    end
  end


  describe '#destroy' do
    it 'allows the user to delete his photos' do
      delete :destroy, :id => photo1.id
      Photo.find_by_id(photo1.id).should be_nil
    end

    it 'will not let you destory posts you do not own' do
      delete :destroy, :id => photo2.id
      Photo.find_by_id(photo2.id).should be_true
    end
  end

  describe "#update" do
    it "updates the caption of a photo" do
      put :update, :id => photo1.id, :photo => { :caption => "now with lasers!" }
      photo1.reload.caption.should == "now with lasers!"
    end

    it "doesn't overwrite random attributes" do
      new_user = Factory.create(:user)
      params = { :caption => "now with lasers!", :person_id => new_user.id }
      put :update, :id => photo1.id, :photo => params
      photo1.reload.person_id.should == user1.person.id
    end

    it 'redirects if you do not have access to the post' do
      params = { :caption => "now with lasers!" }
      put :update, :id => photo2.id, :photo => params
      response.should redirect_to(:action => :index, :pod => user1.person.pod, :username => user1.person.username)
    end
  end

  describe "#make_profile_photo" do

    it 'should return a 201 on a js success' do
      get :make_profile_photo, :photo_id => photo1.id, :format => 'js'
      response.code.should == "201"
    end

    it 'should return a 406 on failure' do
      get :make_profile_photo, :photo_id => photo2.id
      response.code.should == "406"
    end

  end

end
