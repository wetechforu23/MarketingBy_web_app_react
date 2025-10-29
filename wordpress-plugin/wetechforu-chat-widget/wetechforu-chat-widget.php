<?php
/**
 * Plugin Name: WeTechForU AI Chat Widget
 * Plugin URI: https://wetechforu.com/chat-widget
 * Description: AI-powered chat widget V2 with database-driven config, custom avatars, intro flow, and smart responses
 * Version: 2.0.0
 * Author: WeTechForU
 * Author URI: https://wetechforu.com
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: wetechforu-chat-widget
 * Domain Path: /languages
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('WTFU_WIDGET_VERSION', '2.0.0');
define('WTFU_WIDGET_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('WTFU_WIDGET_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Main Plugin Class
 */
class WeTechForU_Chat_Widget {
    
    private static $instance = null;
    
    /**
     * Get singleton instance
     */
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Constructor
     */
    private function __construct() {
        // Initialize plugin
        add_action('plugins_loaded', array($this, 'init'));
        
        // Admin menu
        add_action('admin_menu', array($this, 'add_admin_menu'));
        
        // Settings
        add_action('admin_init', array($this, 'register_settings'));
        
        // Enqueue scripts
        add_action('wp_footer', array($this, 'enqueue_widget_script'));
        
        // Ajax handlers
        add_action('wp_ajax_wtfu_test_connection', array($this, 'test_connection'));
    }
    
    /**
     * Initialize plugin
     */
    public function init() {
        load_plugin_textdomain('wetechforu-chat-widget', false, dirname(plugin_basename(__FILE__)) . '/languages');
    }
    
    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_menu_page(
            __('WeTechForU Chat Widget', 'wetechforu-chat-widget'),
            __('Chat Widget', 'wetechforu-chat-widget'),
            'manage_options',
            'wtfu-chat-widget',
            array($this, 'render_admin_page'),
            'dashicons-format-chat',
            30
        );
    }
    
    /**
     * Register settings
     */
    public function register_settings() {
        register_setting('wtfu_widget_settings', 'wtfu_widget_key');
        register_setting('wtfu_widget_settings', 'wtfu_api_url');
        register_setting('wtfu_widget_settings', 'wtfu_widget_enabled');
    }
    
    /**
     * Render admin page
     */
    public function render_admin_page() {
        ?>
        <div class="wrap">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
            
            <div class="notice notice-info">
                <p>
                    <strong><?php _e('Welcome to WeTechForU AI Chat Widget!', 'wetechforu-chat-widget'); ?></strong><br>
                    <?php _e('This plugin adds an AI-powered chat widget to your website for better customer engagement.', 'wetechforu-chat-widget'); ?>
                </p>
            </div>
            
            <form method="post" action="options.php">
                <?php settings_fields('wtfu_widget_settings'); ?>
                
                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <label for="wtfu_widget_enabled">
                                <?php _e('Enable Widget', 'wetechforu-chat-widget'); ?>
                            </label>
                        </th>
                        <td>
                            <label>
                                <input 
                                    type="checkbox" 
                                    name="wtfu_widget_enabled" 
                                    id="wtfu_widget_enabled" 
                                    value="1" 
                                    <?php checked(1, get_option('wtfu_widget_enabled'), true); ?>
                                />
                                <?php _e('Show chat widget on your website', 'wetechforu-chat-widget'); ?>
                            </label>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="wtfu_widget_key">
                                <?php _e('Widget Key', 'wetechforu-chat-widget'); ?> *
                            </label>
                        </th>
                        <td>
                            <input 
                                type="text" 
                                name="wtfu_widget_key" 
                                id="wtfu_widget_key" 
                                value="<?php echo esc_attr(get_option('wtfu_widget_key')); ?>" 
                                class="regular-text"
                                placeholder="wtfu_xxxxxxxxx"
                                required
                            />
                            <p class="description">
                                <?php _e('Enter your unique widget key provided by WeTechForU.', 'wetechforu-chat-widget'); ?>
                                <br>
                                <?php _e('Don\'t have a key? ', 'wetechforu-chat-widget'); ?>
                                <a href="https://wetechforu.com/get-widget-key" target="_blank">
                                    <?php _e('Get your widget key here', 'wetechforu-chat-widget'); ?>
                                </a>
                            </p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="wtfu_api_url">
                                <?php _e('API URL', 'wetechforu-chat-widget'); ?>
                            </label>
                        </th>
                        <td>
                            <input 
                                type="url" 
                                name="wtfu_api_url" 
                                id="wtfu_api_url" 
                                value="<?php echo esc_attr(get_option('wtfu_api_url', 'https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com')); ?>" 
                                class="regular-text"
                            />
                            <p class="description">
                                <?php _e('Backend URL (leave default unless instructed otherwise).', 'wetechforu-chat-widget'); ?>
                            </p>
                        </td>
                    </tr>
                </table>
                
                <p class="submit">
                    <?php submit_button(__('Save Settings', 'wetechforu-chat-widget'), 'primary', 'submit', false); ?>
                    <button type="button" id="wtfu-test-connection" class="button button-secondary" style="margin-left: 10px;">
                        <?php _e('Test Connection', 'wetechforu-chat-widget'); ?>
                    </button>
                    <span id="wtfu-test-result" style="margin-left: 10px;"></span>
                </p>
            </form>
            
            <hr>
            
            <h2><?php _e('Installation Status', 'wetechforu-chat-widget'); ?></h2>
            <table class="widefat">
                <tr>
                    <td><strong><?php _e('Plugin Version:', 'wetechforu-chat-widget'); ?></strong></td>
                    <td><?php echo WTFU_WIDGET_VERSION; ?></td>
                </tr>
                <tr>
                    <td><strong><?php _e('Widget Status:', 'wetechforu-chat-widget'); ?></strong></td>
                    <td>
                        <?php if (get_option('wtfu_widget_enabled') && get_option('wtfu_widget_key')): ?>
                            <span style="color: green;">✓ <?php _e('Active', 'wetechforu-chat-widget'); ?></span>
                        <?php else: ?>
                            <span style="color: red;">✗ <?php _e('Inactive', 'wetechforu-chat-widget'); ?></span>
                        <?php endif; ?>
                    </td>
                </tr>
                <tr>
                    <td><strong><?php _e('Website URL:', 'wetechforu-chat-widget'); ?></strong></td>
                    <td><?php echo get_site_url(); ?></td>
                </tr>
            </table>
            
            <h2><?php _e('Need Help?', 'wetechforu-chat-widget'); ?></h2>
            <p>
                <a href="https://wetechforu.com/docs/chat-widget" target="_blank" class="button">
                    <?php _e('View Documentation', 'wetechforu-chat-widget'); ?>
                </a>
                <a href="https://wetechforu.com/support" target="_blank" class="button">
                    <?php _e('Contact Support', 'wetechforu-chat-widget'); ?>
                </a>
            </p>
        </div>
        
        <script>
        jQuery(document).ready(function($) {
            $('#wtfu-test-connection').on('click', function() {
                var button = $(this);
                var result = $('#wtfu-test-result');
                
                button.prop('disabled', true).text('<?php _e('Testing...', 'wetechforu-chat-widget'); ?>');
                result.html('');
                
                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'wtfu_test_connection',
                        widget_key: $('#wtfu_widget_key').val(),
                        api_url: $('#wtfu_api_url').val()
                    },
                    success: function(response) {
                        if (response.success) {
                            result.html('<span style="color: green;">✓ ' + response.data.message + '</span>');
                        } else {
                            result.html('<span style="color: red;">✗ ' + response.data.message + '</span>');
                        }
                    },
                    error: function() {
                        result.html('<span style="color: red;">✗ <?php _e('Connection failed', 'wetechforu-chat-widget'); ?></span>');
                    },
                    complete: function() {
                        button.prop('disabled', false).text('<?php _e('Test Connection', 'wetechforu-chat-widget'); ?>');
                    }
                });
            });
        });
        </script>
        
        <style>
        .wtfu-admin-page { max-width: 800px; }
        .wtfu-admin-page h2 { margin-top: 30px; }
        </style>
        <?php
    }
    
    /**
     * Test connection to API
     */
    public function test_connection() {
        check_ajax_referer('wtfu_widget_nonce', 'nonce');
        
        $widget_key = sanitize_text_field($_POST['widget_key']);
        $backend_url = esc_url_raw($_POST['api_url']);
        
        if (empty($widget_key) || empty($backend_url)) {
            wp_send_json_error(array('message' => __('Widget key and Backend URL are required', 'wetechforu-chat-widget')));
        }
        
        // Test connection to widget config endpoint
        $response = wp_remote_get($backend_url . '/api/chat-widget/public/widget/' . $widget_key . '/config');
        
        if (is_wp_error($response)) {
            wp_send_json_error(array('message' => __('Failed to connect to API', 'wetechforu-chat-widget')));
        }
        
        $status_code = wp_remote_retrieve_response_code($response);
        
        if ($status_code === 200) {
            wp_send_json_success(array('message' => __('Connection successful!', 'wetechforu-chat-widget')));
        } else {
            wp_send_json_error(array('message' => __('Invalid widget key or configuration', 'wetechforu-chat-widget')));
        }
    }
    
    /**
     * Enqueue widget script on frontend
     */
    public function enqueue_widget_script() {
        // Only load if enabled and key is set
        if (!get_option('wtfu_widget_enabled') || !get_option('wtfu_widget_key')) {
            return;
        }
        
        $widget_key = get_option('wtfu_widget_key');
        $backend_url = 'https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com'; // Fixed: Base URL only
        
        ?>
        <!-- WeTechForU AI Chat Widget V2 - Database-Driven Config -->
        <script src="<?php echo esc_url($backend_url); ?>/public/wetechforu-widget-v2.js?v=<?php echo time(); ?>"></script>
        <script>
        // ✅ ONLY pass required fields - widget loads ALL other settings from database!
        if (window.WeTechForUWidget) {
            WeTechForUWidget.init({
                widgetKey: '<?php echo esc_js($widget_key); ?>',
                backendUrl: '<?php echo esc_js($backend_url); ?>'
                // ✅ All other settings (botName, colors, avatar, welcome message, intro flow) 
                //    are loaded automatically from the database via loadWidgetConfig()!
            });
        }
        </script>
        <?php
    }
}

/**
 * Initialize plugin
 */
function wtfu_chat_widget_init() {
    return WeTechForU_Chat_Widget::get_instance();
}

// Start the plugin
wtfu_chat_widget_init();

/**
 * Activation hook
 */
register_activation_hook(__FILE__, 'wtfu_chat_widget_activate');
function wtfu_chat_widget_activate() {
    // Set default options
    if (!get_option('wtfu_api_url')) {
        update_option('wtfu_api_url', 'https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com');
    }
}

/**
 * Deactivation hook
 */
register_deactivation_hook(__FILE__, 'wtfu_chat_widget_deactivate');
function wtfu_chat_widget_deactivate() {
    // Cleanup if needed
}

