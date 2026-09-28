package config

import (
	"fmt"
	"os"
	"time"

	"gopkg.in/yaml.v3"
)

type Server struct {
	Desc          string `yaml:"desc"`
	Host          string `yaml:"host"`
	Port          int    `yaml:"port"`
	SSLMode       string `yaml:"sslmode"`
	DefaultDB     string `yaml:"defaultdb"`
	PgDumpPath    string `yaml:"pg_dump_path"`
	PgDumpAllPath string `yaml:"pg_dumpall_path"`
	Theme         string `yaml:"theme,omitempty"`
}

type ServerHTTP struct {
	Listen       string `yaml:"listen"`
	ReadTimeout  string `yaml:"read_timeout"`
	WriteTimeout string `yaml:"write_timeout"`
	SessionKey   string `yaml:"session_key"`
	RedisURL     string `yaml:"redis_url,omitempty"`
}

type Config struct {
	Servers            []Server   `yaml:"servers"`
	DefaultLang        string     `yaml:"default_lang"`
	Autocomplete       string     `yaml:"autocomplete"`
	ExtraLoginSecurity bool       `yaml:"extra_login_security"`
	OwnedOnly          bool       `yaml:"owned_only"`
	ShowComments       bool       `yaml:"show_comments"`
	ShowAdvanced       bool       `yaml:"show_advanced"`
	ShowSystem         bool       `yaml:"show_system"`
	MinPasswordLength  int        `yaml:"min_password_length"`
	LeftWidth          int        `yaml:"left_width"`
	Theme              string     `yaml:"theme"`
	ShowOIDs           bool       `yaml:"show_oids"`
	MaxRows            int        `yaml:"max_rows"`
	MaxChars           int        `yaml:"max_chars"`
	HelpBase           string     `yaml:"help_base"`
	AjaxRefresh        int        `yaml:"ajax_refresh"`
	Server             ServerHTTP `yaml:"server"`
	Plugins            []string   `yaml:"plugins"`
	LogLevel           string     `yaml:"log_level"`
}

func Default() *Config {
	return &Config{
		Servers: []Server{
			{
				Desc:          "PostgreSQL",
				Host:          "",
				Port:          5432,
				SSLMode:       "allow",
				DefaultDB:     "postgres",
				PgDumpPath:    "/usr/bin/pg_dump",
				PgDumpAllPath: "/usr/bin/pg_dumpall",
			},
		},
		DefaultLang:        "auto",
		Autocomplete:       "default on",
		ExtraLoginSecurity: true,
		OwnedOnly:          false,
		ShowComments:       true,
		ShowAdvanced:       false,
		ShowSystem:         false,
		MinPasswordLength:  1,
		LeftWidth:          200,
		Theme:              "default",
		ShowOIDs:           false,
		MaxRows:            30,
		MaxChars:           50,
		HelpBase:           "https://www.postgresql.org/docs/%s/interactive/",
		AjaxRefresh:        3,
		Server: ServerHTTP{
			Listen:       ":8080",
			ReadTimeout:  "15s",
			WriteTimeout: "30s",
		},
		Plugins:  []string{},
		LogLevel: "info",
	}
}

func Load(path string) (*Config, error) {
	cfg := Default()
	if path == "" {
		return cfg, nil
	}
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return cfg, nil
		}
		return nil, fmt.Errorf("read config %s: %w", path, err)
	}
	if err := yaml.Unmarshal(data, cfg); err != nil {
		return nil, fmt.Errorf("parse config %s: %w", path, err)
	}
	if err := cfg.Validate(); err != nil {
		return nil, err
	}
	return cfg, nil
}

func (c *Config) Validate() error {
	if len(c.Servers) == 0 {
		return fmt.Errorf("config: at least one server required")
	}
	for i, s := range c.Servers {
		if s.Port < 0 || s.Port > 65535 {
			return fmt.Errorf("config: servers[%d].port out of range", i)
		}
		switch s.SSLMode {
		case "", "disable", "allow", "prefer", "require", "legacy", "unspecified", "verify-ca", "verify-full":
		default:
			return fmt.Errorf("config: servers[%d].sslmode invalid: %s", i, s.SSLMode)
		}
		if s.DefaultDB == "" {
			c.Servers[i].DefaultDB = "postgres"
		}
	}
	if c.MaxRows <= 0 {
		c.MaxRows = 30
	}
	if c.MaxChars <= 0 {
		c.MaxChars = 50
	}
	if c.Server.Listen == "" {
		c.Server.Listen = ":8080"
	}
	for i, s := range c.Servers {
		if s.PgDumpPath == "" {
			c.Servers[i].PgDumpPath = "/usr/bin/pg_dump"
		}
		if s.PgDumpAllPath == "" {
			c.Servers[i].PgDumpAllPath = "/usr/bin/pg_dumpall"
		}
	}
	return nil
}

func (c *Config) ReadTimeout() time.Duration {
	d, err := time.ParseDuration(c.Server.ReadTimeout)
	if err != nil {
		return 15 * time.Second
	}
	return d
}

func (c *Config) WriteTimeout() time.Duration {
	d, err := time.ParseDuration(c.Server.WriteTimeout)
	if err != nil {
		return 30 * time.Second
	}
	return d
}

func (s Server) DSN(database, username, password string) string {
	host := s.Host
	if host == "" {
		host = ""
	}
	sslmode := s.SSLMode
	if sslmode == "" {
		sslmode = "allow"
	}
	if database == "" {
		database = s.DefaultDB
	}

	if host == "" {
		return fmt.Sprintf("postgres://%s:%s@/ %s?sslmode=%s", esc(username), esc(password), esc(database), esc(sslmode))
	}
	return fmt.Sprintf("postgres://%s:%s@%s:%d/%s?sslmode=%s", esc(username), esc(password), esc(host), s.Port, esc(database), esc(sslmode))
}

func esc(s string) string {
	replacer := map[byte]string{
		':': "%3A", '/': "%2F", '@': "%40", '?': "%3F", '#': "%23", ' ': "%20",
		'%': "%25",
	}
	out := make([]byte, 0, len(s)*3)
	for i := 0; i < len(s); i++ {
		if r, ok := replacer[s[i]]; ok {
			out = append(out, r...)
		} else {
			out = append(out, s[i])
		}
	}
	return string(out)
}
