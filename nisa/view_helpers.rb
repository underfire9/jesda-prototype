# -*- encoding : utf-8 -*-
class TagNode
  include Serve::TagHelpers
  def initialize(name, options = {})
    @name = name.to_s
    @attributes = options
    @children = []
  end

  def addClass(x)
    if @attributes[:class].blank?
      @attributes[:class] = x.to_s
    else
      @attributes[:class] = @attributes[:class] + " #{x}"
    end
  end

  def to_s
    value = @children.each { |c| c.to_s }.join
    content_tag(@name, value.to_s, @attributes)
  end

  def <<(tag_node)
    @children << tag_node
  end
end


module ViewHelpers

  def fake_person_name
    %w{黃　捷 楊傑仁 吳卓芳 梁芳瑜 顏偉傑 林垣佑 林立仁 顏呈洋 張子倩 林姿廷 賴育絜 林育辰 廖茂亨 林志祐 陳科翰 李柏叡 林俊瑋 李玟樺}.shuffle.first
  end

  def fake_company_name
    %w{大猩猩科技 老大人企管顧問 米格魯資訊 火星人行銷 濕答答防水工程 亮晶晶照明 噴火龍消防工程}.shuffle.first
  end

  def fake_ticket_name
    %w{一般票 學生票 VIP票 早鳥票 特價票 合作廠商優惠票 地方回饋票 選民服務專用票}.shuffle.first
  end

  def button(string, url, options={})
    icon_classname = options.delete(:icon)

    options[:class] ||= "btn"

    link_to "#{content_tag("i","", :class => "icon-" + icon_classname) if icon_classname} #{string}", url, options
  end


  def fake_event(attr)
    @fake_events||=YAML.load_file(File.join(File.dirname(__FILE__), 'fake_data.yml'))

    data = @fake_events[rand(@fake_events.size)][attr.to_s]
    if RUBY_VERSION > '1.9'
      return data.force_encoding('utf-8')
    else
      return data
    end
  end

  def fake_list_name
    ["老客戶", "澳洲客戶", "潛在客群", "VIP", "100大公司員工", "固定班底", "活動義工"].shuffle.first
  end

  def active?(patten)
    request.path =~ patten ? "active" : ""
  end

  def method_missing(x)
    if x.to_s.match(/_path$/)

      project_path = File.expand_path(Compass.configuration.project_path)
      target = File.expand_path(File.join(project_path, x.to_s.split(/_/)[0...-1] ))

      #folder
      return target[project_path.length .. -1] if File.directory?(target)

      #template file
      Dir.glob( File.join(File.dirname(target), '*') )  do |x|
        return x[project_path.length..-1] if File.fnmatch("#{target}*", x)
      end
    end
    super
  end


  def current_url
    request.url
  end

  def title(page_title)
    content_for(:title) { page_title }
  end

  def yield_or_default(message, default_message = "")
    message.nil? ? default_message : message
  end

  # .current will be added to current action, but if you want to add .current to another link, you can set @current = ['/other_link']
  # TODO: hot about render_list( *args )
  def render_list(list=[], options={})
    if list.is_a? Hash
      options = list
      list = []
    end

    yield(list) if block_given?

    list_type ||= "ul"

    if options[:type]
      if ["ul", "dl", "ol"].include?(options[:type])
        list_type = options[:type]
      end
    end

    ul = TagNode.new(list_type, :id => options[:id], :class => options[:class] )
    ul.addClass("unstyled") if (options[:type] && options[:type] == "unstyled")

    list.each_with_index do |content, i|
      item_class = []
      item_class << "first" if i == 0
      item_class << "last" if i == (list.length - 1)

      item_content = content
      item_options = {}

      if content.is_a? Array
        item_content = content[0]
        item_options = content[1]
      end

      if item_options[:class]
        item_class << item_options[:class]
      end

      link = item_content.match(/href=(["'])(.*?)(\1)/)[2] rescue nil
      if item_options[:active].nil?
        if ( link && current_page?(link) ) || ( @current && @current.include?(link) )
          item_class << "active"
        end
      else
        item_class << "active" if item_options[:active]
      end

      item_class = (item_class.empty?)? nil : item_class.join(" ")
      ul << li = TagNode.new('li', :class => item_class )
      li << item_content
    end

    return ul.to_s
  end

  def current_page?(path)
    if current_url =~ /\.html/ #file
      current_url =~ %r{#{path}}
    else #folder index page
      "#{current_url}/index.html" =~ %r{#{path}} || "#{current_url}/index.html.erb" =~ %r{#{path}}
    end

  end

  def current_page_class(url, options={})
    options = {:class=> ''}.merge(options)
    if current_page?(url)
      ("class=\"active #{options[:class]}\"").html_safe
    else
      ("class=\"#{options[:class]}\"").html_safe
    end

  end

  def dropdown_menu_item(title)
    link    = link_to("#{title}<b class=\"caret\"></b>", "#", :class => "dropdown-toggle", "data-toggle" => "dropdown")

    submenu = render_list( :class => "dropdown-menu") do |list|
      yield(list) if block_given?
    end

    return [ "#{link}#{submenu}", {:class => "dropdown"} ]
  end


  def input_block(label, options={}, &block)
    label_body =  (options[:required] ? content_tag(:span, "*", :class => "required") : '') + label
    label_tag = content_tag( :label, label_body, :class => "control-label")
    content = content_tag :div, label_tag + '<div class="controls">'+ capture(&block) + '</div>', :class => 'control-group'
    @_out_buf += content
  end

  def help(str)
    content_tag :span, str, :class=> "help-block"
  end

  def select(select_options, help_str, options={})
    options_str = "<option>"+select_options.join('</option><option>')+"</option>"
    help_str = content_tag :span, help(help_str), :class=> "help-block"
    content_tag(:select, options_str, options)+help(help_str)
  end

  def text(value,  help_str, options={})
    content_tag(:input, nil, options.merge(:value => value, :type=>"text")) + help(help_str)
  end

  def note_for(&block)
    content_for :note do
      block.call
    end
  end

  def submit_btn
    content = content_tag :div, '<div class="controls"><button type="submit" class="btn btn-primary">Submit</button></div>', :class => 'control-group'
  end

  def checkbox(label)
      content_tag :labal,  '<input type="checkbox">' + label
  end

  def rand_code(length= 7)
    base_chars = ("A".."Z").to_a + ("0".."9").to_a
    special_case = ["I","1","0","O","Q","U","V","2","Z"]
    chars = base_chars - special_case
    code=""
    7.times{
      code += chars[rand(chars.size)]
    }
    code
  end

  def remove_html_tags(str)
    re = /<("[^"]*"|'[^']*'|[^'">])*>/
    str.gsub(re, '')
  end

end

