package dump

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/bikky-kc013/TableForge/internal/config"
)

type Options struct {
	ServerIdx    int
	Database     string
	Schema       string
	Table        string
	Format       string
	DataOnly     bool
	SchemaOnly   bool
	Clean        bool
	IfExists     bool
	Create       bool
	NoOwner      bool
	NoPrivileges bool
	NoComments   bool
	Verbose      bool
}

func (o Options) Validate() error {
	if o.Database != "" && strings.ContainsAny(o.Database, ";`$|&") {
		return fmt.Errorf("invalid database name")
	}
	if o.Format != "" {
		switch o.Format {
		case "plain", "custom", "directory", "tar", "csv", "sql":
		default:
			return fmt.Errorf("invalid format %q", o.Format)
		}
	}
	return nil
}

func BuildArgs(srv config.Server, username string, o Options) ([]string, error) {
	if err := o.Validate(); err != nil {
		return nil, err
	}
	bin := srv.PgDumpPath
	if bin == "" {
		bin = "/usr/bin/pg_dump"
	}
	if !filepath.IsAbs(bin) {
		return nil, fmt.Errorf("pg_dump_path must be absolute")
	}
	if _, err := os.Stat(bin); err != nil {
	}

	args := []string{}
	if srv.Host != "" {
		args = append(args, "-h", srv.Host)
	}
	if srv.Port != 0 {
		args = append(args, "-p", fmt.Sprintf("%d", srv.Port))
	}
	if username != "" {
		args = append(args, "-U", username)
	}
	if o.Format != "" && o.Format != "sql" && o.Format != "csv" {
		switch o.Format {
		case "custom":
			args = append(args, "-Fc")
		case "directory":
			args = append(args, "-Fd")
		case "tar":
			args = append(args, "-Ft")
		default:
			args = append(args, "-Fp")
		}
	}
	if o.DataOnly {
		args = append(args, "-a")
	}
	if o.SchemaOnly {
		args = append(args, "-s")
	}
	if o.Clean {
		args = append(args, "-c")
	}
	if o.IfExists {
		args = append(args, "--if-exists")
	}
	if o.Create {
		args = append(args, "-C")
	}
	if o.NoOwner {
		args = append(args, "--no-owner")
	}
	if o.NoPrivileges {
		args = append(args, "--no-privileges")
	}
	if o.Schema != "" {
		args = append(args, "-n", o.Schema)
	}
	if o.Table != "" {
		t := o.Table
		if o.Schema != "" && !strings.Contains(t, ".") {
			t = o.Schema + "." + t
		}
		args = append(args, "-t", t)
	}
	args = append(args, o.Database)
	_ = bin
	return args, nil
}

func Run(ctx context.Context, srv config.Server, password string, o Options, outputPath string) error {
	args, err := BuildArgs(srv, "", o)
	if err != nil {
		return err
	}
	bin := srv.PgDumpPath
	if bin == "" {
		bin = "/usr/bin/pg_dump"
	}
	cmd := exec.CommandContext(ctx, bin, args...)
	cmd.Env = []string{
		"PGPASSWORD=" + password,
		"PGSSLMODE=" + srv.SSLMode,
	}
	if outputPath != "" {
		f, err := os.Create(outputPath)
		if err != nil {
			return err
		}
		defer f.Close()
		cmd.Stdout = f
	}
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("pg_dump: %w", err)
	}
	return nil
}

func IsDumpEnabled(srv config.Server, all bool) bool {
	if all {
		return srv.PgDumpAllPath != ""
	}
	return srv.PgDumpPath != ""
}
